# Oracle Enterprise Manager 13.5 Examples SQL Samples（摘录）

> 来源：Oracle 官方 Examples 页面。

## 与本项目首批三张白名单视图强相关的示例

### Inventory: Agent-side targets
```sql
SELECT target_type, type_display_name, COUNT(*) cnt
FROM mgmt$target
WHERE emd_url IS NOT NULL
GROUP BY target_type, type_display_name
ORDER BY target_type;
```

### Monitoring: current CPU utilization of a host
```sql
SELECT column_label, value
FROM   mgmt$metric_current
WHERE  metric_name = 'Load'
  AND  metric_column = 'cpuUtil'
  AND  target_name = 'my.example.com';
```

### Monitoring: hosts with more than 90 percent CPU utilization
```sql
SELECT target_name, collection_timestamp, value
FROM   mgmt$metric_current
WHERE  target_type   = 'host'
  AND  metric_name   = 'Load'
  AND  metric_column = 'cpuUtil'
  AND  value > 90;
```

说明：完整示例集合可继续补充到本文件，供 NL2SQL few-shot 使用。
