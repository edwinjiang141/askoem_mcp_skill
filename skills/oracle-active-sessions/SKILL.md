---
name: oracle-active-sessions
description: >-
  快速统计 Oracle 数据库当前活动会话（gv$session 实时快照，非 ASH/AWR）：分实例总数、等待类别分布、
  Top 10 等待事件、Top 10 用户/程序/服务、长运行活动会话、阻塞链。Use when 用户问「当前活动会话」
  「active session」「活动会话数」「谁在跑 / 在等什么」「有没有阻塞 / 谁阻塞谁」等即时状态问题。
  不触发：
  - ASH/AWR 历史分析（本 Skill 仅快照，不查 dba_hist_active_sess_history）
  - TM/TX 锁专项处置 SOP（请用 oracle-enq-tm-contention）
  - 多维快速巡检（请用 oracle-db-quick-health）
---

# Oracle 当前活动会话统计

## Goal
对当前连接的 Oracle 实例（gv$session 跨实例快照）统计 **此刻** 活动会话的分布：

- 总量（按实例 / 状态）
- 活动会话按 `wait_class` 分组
- 活动会话 Top 10 等待事件
- 活动会话按 用户 / 程序 / 服务 Top 10
- 长运行活动会话（`last_call_et > 60s`）
- 阻塞链（`final_blocking_session` 非空）

仅只读 SELECT；Skill SQL 经 `execute_skill_omr_sql` 执行（允许 `gv$`/`v$` 诊断视图）。

## Workflow
按顺序执行以下步骤，每步一条只读 SQL。任何一步执行失败：在「证据」段说明错误，不要编造数据。

### 步骤 1：活动会话总数（按实例 / 状态）

```sql
SELECT inst_id,
       status,
       COUNT(*) AS session_count
  FROM gv$session
 WHERE type = 'USER'
 GROUP BY inst_id, status
 ORDER BY inst_id, status
```

### 步骤 2：活动会话 — 按 wait_class 分布

哪一类等待最多（User I/O / Concurrency / Application / Commit / Configuration / Cluster / Scheduler / Administrative / Network / Other / NULL=CPU）。

```sql
SELECT inst_id,
       NVL(wait_class, 'NULL (on CPU)') AS wait_class,
       COUNT(*)                         AS active_count
  FROM gv$session
 WHERE status = 'ACTIVE'
   AND type   = 'USER'
 GROUP BY inst_id, wait_class
 ORDER BY inst_id, active_count DESC
```

### 步骤 3：活动会话 — Top 10 等待事件

```sql
SELECT * FROM (
  SELECT inst_id,
         event,
         COUNT(*) AS active_count
    FROM gv$session
   WHERE status = 'ACTIVE'
     AND type   = 'USER'
   GROUP BY inst_id, event
   ORDER BY active_count DESC
) WHERE ROWNUM <= 10
```

### 步骤 4：活动会话 — Top 10 用户 / 程序 / 服务

```sql
SELECT * FROM (
  SELECT inst_id,
         username,
         program,
         service_name,
         COUNT(*) AS active_count
    FROM gv$session
   WHERE status = 'ACTIVE'
     AND type   = 'USER'
   GROUP BY inst_id, username, program, service_name
   ORDER BY active_count DESC
) WHERE ROWNUM <= 10
```

### 步骤 5：长运行活动会话（last_call_et > 60s）

`last_call_et` 单位秒，表示当前调用已持续多久；持续上升通常代表慢 SQL 或被阻塞。

```sql
SELECT * FROM (
  SELECT inst_id,
         sid,
         serial#,
         username,
         status,
         event,
         wait_class,
         last_call_et,
         sql_id,
         blocking_instance,
         blocking_session,
         final_blocking_instance,
         final_blocking_session
    FROM gv$session
   WHERE status = 'ACTIVE'
     AND type   = 'USER'
     AND last_call_et > 60
   ORDER BY last_call_et DESC
) WHERE ROWNUM <= 20
```

### 步骤 6：阻塞链（final_blocking_session 非空）

```sql
SELECT * FROM (
  SELECT inst_id,
         sid,
         serial#,
         username,
         event,
         wait_class,
         last_call_et,
         blocking_instance,
         blocking_session,
         final_blocking_instance,
         final_blocking_session,
         sql_id
    FROM gv$session
   WHERE status = 'ACTIVE'
     AND type   = 'USER'
     AND final_blocking_session IS NOT NULL
   ORDER BY last_call_et DESC
) WHERE ROWNUM <= 20
```

## 字段速查（给 LLM 写证据用）
- `inst_id`：RAC 实例号
- `wait_class = NULL` 且 `status = ACTIVE`：会话在 CPU 上（非等待）
- `last_call_et`：当前调用持续秒数；同一 SID 数次观察仍在涨 = 慢 / 被阻塞
- `blocking_session` / `final_blocking_session`：直接阻塞者 / 链顶阻塞者（SID）
- 阻塞链中 `event` 常见：`enq: TX - row lock contention`、`enq: TM - contention`、`library cache lock` 等

## Constraints
- **输出固定四段**（中文，Markdown 二级标题）：**结论** / **证据** / **下一步建议** / **深挖入口**
- **证据** 必须逐步骤引用上面 6 组结果中的字段与数值；不得编造 SQL 未返回的数字；某步为空时明确写「无数据」
- **结论** 必须明确回答三问：
  1. 当前 **每实例活动会话数** 是多少？
  2. 主要 **等待在哪** （Top wait_class / Top event）？
  3. **有没有阻塞链**（步骤 6 是否非空）？
- **下一步建议** ≤3 条；涉及 `kill session`/`alter system` 等 **只复述命令原文**，声明须人工执行；若阻塞链涉及 TM/TX，引导用户改用 `oracle-enq-tm-contention` Skill
- **深挖入口**：给出 OEM 控制台 Performance / Top Activity 入口说明；不编造具体 URL，不列外部链接

## Validation
- 步骤 1–4 对正常实例必返回非空；步骤 5、6 为空属正常结论（写「当前无长运行 / 无阻塞」即可）
- 四段齐全、每段非空；证据段出现至少步骤 1/2/3 的计数与 Top 行
