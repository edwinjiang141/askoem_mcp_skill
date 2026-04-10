### MGMT$TARGET

列出 Management Repository 已知的受管目标信息；目标可以只是已注册，不一定处于活跃监控状态。

**字段说明**
- `TARGET_NAME`：目标名称。
- `TARGET_TYPE`：目标类型，例如 database、host。
- `TARGET_GUID`：目标全局唯一标识。
- `DISPLAY_NAME`：目标的友好显示名称。
- `HOST_NAME`：目标所在主机名。
- `LAST_METRIC_LOAD_TIME`：该目标数据最近一次装载时间。
- `LAST_LOAD_TIME_UTC`：该目标数据最近一次装载的 UTC 时间。
- `CREATION_DATE`：目标首次加入 Repository 的日期。

**使用说明 / 补充说明**
- 常用于查看 Repository 中已知目标列表。
- 按 TARGET_NAME + TARGET_TYPE 过滤时可更高效地使用索引。
- 若想按数据新鲜度排序，可结合 LAST_METRIC_LOAD_TIME 或 LAST_LOAD_TIME_UTC。
