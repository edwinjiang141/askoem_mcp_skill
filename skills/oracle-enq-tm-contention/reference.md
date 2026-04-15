# 后续信息采集参考

故障恢复后如需进行根因分析，收集以下数据提交给原厂工程师。

## sqlhc 数据

```sql
SQL> conn / as sysdba
SQL> @get_sqlhc.sql
Enter value for sql_id: <问题SQL的sql_id>
```

## ASH Dump 数据

```sql
conn / as sysdba
@ash_dump.sql
```

## AWR Report 数据

```sql
conn / as sysdba
@awr_report.sql
```

## OSW 数据

```bash
cd oswbb/archive
find . -name "*<日期时间模式>*" -exec zip /tmp/osw_`hostname`_<标签>.zip {} \;
```

## TFA 数据

```bash
su - root
tfactl diagcollect -from "<起始时间>" -to "<结束时间>"
```

> 时间格式示例：`"Jun/12/2022 18:00:00"`

## OPATCH 数据

```bash
opatch lsinventory -detail
```

## 采集注意事项

- 信息搜集相关命令已在 ACS Team 测试环境测试过，不同平台可能略有差异
- systemstate、errstack、部分进程 process dump 和 truss 跟踪可能严重消耗系统性能，需谨慎使用
- 日志采集可能导致磁盘空间耗尽，需关注磁盘空间
- 应急操作可能需要绕过系统安全控制与 MAA 高可用保障措施
- 强烈建议建立完善的数据库备份和恢复机制，定期进行备份与可恢复验证
