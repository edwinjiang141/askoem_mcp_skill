## 1. MGMT$INCIDENTS

### 视图说明
`MGMT$INCIDENTS` 用于查看 Incident 的属性，包括摘要消息（summary message）。

### 使用提示
查询该视图时，建议优先对 `OPEN_STATUS` 和 `CLOSED_DATE` 做过滤，以利用分区。

### 字段说明
| 字段 | 说明 |
|---|---|
| INCIDENT_ID | Incident 的唯一 RAW ID。 |
| INCIDENT_NUM | 面向最终用户可见的 Incident 编号。 |
| SUMMARY_MSG | Incident 的摘要消息。 |
| SEVERITY | Incident 的严重级别。 |
| PRIORITY | Incident 的优先级。 |
| OWNER | 问题所有者。 |
| CREATION_DATE | Incident 创建时间。 |
| LAST_UPDATED_DATE | Incident 最后更新时间。 |
| EVENT_COUNT | 与该 Incident 关联的事件数量。 |
| OPEN_STATUS | Incident 状态。`1`=Open，`0`=Closed。 |
| CLOSED_DATE | Incident 关闭时间；若未关闭则为空。 |
| TARGET_GUID | 与 Incident 关联的 target 唯一 ID。 |
