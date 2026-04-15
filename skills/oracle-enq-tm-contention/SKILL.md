---
name: oracle-enq-tm-contention
description: >-
  Oracle数据库 enq: TM - contention 等待事件的故障应急处理流程。当数据库出现
  TM锁争用、应用阻塞、enqueue contention等问题时使用。包含诊断SQL、
  Blocker定位、Kill Session操作及后续信息采集步骤。
---

# Oracle enq: TM - contention 应急预案

## 背景知识

TM锁（Table Manipulation Enqueue）用于保护表定义。当事务对表执行 INSERT、UPDATE、DELETE、MERGE 或 SELECT ... FOR UPDATE 时，需先在修改对象表和关联表上获取 TM 锁，以保护 DML 期间表定义不被 DDL 修改。

等待事件 `enq: TM - contention` 常见原因：
- 其他并行进程长时间持有同一 DML 对象表的 TM 锁
- 其他并行进程长时间持有 DML 对象表的同一父表（外键关联）

## 故障现象

应用反应堵塞，检查数据库等待事件出现 `enq: TM - contention`。

## 应急处理步骤

按以下步骤依次执行。遇到分支判断时根据实际情况选择路径。

### 步骤1：在发生 enq: TM - contention 的实例上执行诊断查询

连续数次（3次以上）执行以下两组查询，观察结果是否变化。

**查询A — 查看等待 TM contention 的会话：**

```sql
set linesize 180
set pagesize 999
column username format a16
column event format a40
column sql_child_number format 9999 heading 'SQL Child|Number'
column blocking_instance format 9999 heading 'Blocker|Instance'
column blocking_session format 99999 heading 'Blocker|Session'
column FINAL_BLOCKING_INSTANCE format 9999 heading 'F_Blocker|Instance'
column FINAL_BLOCKING_SESSION format 99999 heading 'F_Blocker|Session'
column "Lock" format a6
column "Mode" format a6

Select inst_id,
       sid,
       seq#,
       username,
       event,
       sql_id,
       sql_child_number,
       chr(to_char(bitand(p1, -16777216)) / 16777215) ||
       chr(to_char(bitand(p1, 16711680)) / 65535) "Lock",
       to_char(bitand(p1, 65535)) "Mode",
       blocking_instance,
       blocking_session,
       final_blocking_instance,
       final_blocking_session,
       last_call_et
  From gv$session
 Where event = 'enq: TM - contention';
```

**查询B — 查看 TM/TX 锁分布：**

```sql
set linesize 180
set pagesize 999
SELECT sid, type, id1, id2, lmode, request
  FROM v$lock
 Where type in ('TM', 'TX')
 Order by id1, sid;
```

关注结果中的关键字段：
- **ID1**：对于 TM 锁，代表表的 Object_id
- **LMODE**：持有锁的 Mode（3 = Row-exclusive）
- **REQUEST**：请求锁的 Mode（4 = Share）

### 步骤2：分析查询结果

**如果查询结果持续变化** → 说明锁在正常流转，继续观察，不需立即干预。

**如果查询结果没有变化** → 进入步骤3。

### 步骤3：定位 Blocker

使用以下 SQL 定位阻塞者：

```sql
SELECT distinct w.tm, w.p2 OBJECT_ID, l.inst_id, l.sid, l.lmode, l.request
 FROM
  ( SELECT p2, p3, 'TM-'||substr(p2raw,-8)||'-'||lpad(p3,8,'0') TM
      FROM v$session_wait
     WHERE event='enq: TM - contention'
       and state='WAITING'
  ) W,
  gv$lock L
 WHERE l.type(+)='TM'
   and l.id1(+)=w.p2
   and l.id2(+)=w.p3
 ORDER BY tm, lmode desc, request desc;
```

### 步骤4：检查是否涉及外键关联

如果两个 SESSION 针对不同的 ID1 发生等待，可能是两个表存在外键参照关系。

查看表定义确认外键：

```sql
select dbms_metadata.get_ddl('TABLE','<TABLE_NAME>','<OWNER>') from dual;
```

查询外键约束关系：

```sql
SELECT distinct a.owner owner_name,
  a.table_name table_name,
  a.constraint_name key_name,
  b.constraint_type key_type,
  b.table_name referencing_table,
  b.constraint_name foreign_key_name
FROM dba_constraints a,
  dba_constraints b
WHERE a.constraint_name = b.r_constraint_name
  AND a.owner = '<OWNER>'
ORDER BY 1, 2, 3, 4;
```

> `CONSTRAINT_TYPE = 'R'` 代表外键约束。

### 步骤5：Kill 阻塞会话

找到 Blocker 进程后：

1. **确认不是 Oracle 后台进程**（后台进程不可随意 kill，否则会导致系统 crash）
2. 生成 KILL 命令：

```sql
set lines 200 pages 999
col username for a15
col machine for a20
col program for a35
col spid for 99999999999
col dbkill for a40
col oskill for a20
col service_name for a20

select a.username,
       a.program,
       b.addr,
       b.spid,
       'alter system kill session ''' || a.sid || ',' || a.serial# || ''';' "dbkill",
       'kill -9 ' || b.spid "oskill"
  from v$session a, v$process b
 where a.paddr = b.addr(+)
   and a.sid = &sid
   and a.serial# = &serial
 order by a.username, a.program;
```

3. **先执行 dbkill**（`ALTER SYSTEM KILL SESSION`），观察 session 状态
4. **如果长时间未消失**，在 OS 级别执行 oskill：

```bash
ps -ef | grep <spid>
kill -9 <spid>
```

> 再次强调：如果是 Oracle 后台进程，不可执行 kill，否则会导致实例 crash。

### 步骤6：如果涉及 TX 锁

如果 TM 锁持有者同时持有未完成的 TX 锁，可参考 `enq: TX` 相关的应急方法进一步处理。

## 后续信息采集

故障恢复后如需进行根因分析，收集以下数据提交给原厂工程师。
详见 [reference.md](reference.md)。
