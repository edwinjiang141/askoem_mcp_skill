## 10. MGMT$METRIC_CURRENT

**视图说明**
显示已加载到 Repository 中的**最新指标值**。

### 字段说明
| 字段 | 说明 |
|---|---|
| TARGET_NAME | 目标名称。 |
| TARGET_TYPE | 目标类型。 |
| TARGET_GUID | 目标 GUID。 |
| METRIC_NAME | 指标名称。 |
| METRIC_COLUMN | 表类型指标列名。 |
| METRIC_LABEL | 指标显示名称。 |
| COLUMN_LABEL | 指标列显示名称。 |
| COLLECTION_TIMESTAMP | 最新值被采集/检测到的时间。 |
| VALUE | 最新指标值（字符串）。 |
| KEY_VALUE ~ KEY_VALUE5 | 对应键值。 |

### 使用提示
- 用于查看某目标某指标当前的最新值。
- 按 `TARGET_NAME`、`TARGET_TYPE`、`METRIC_NAME`、`METRIC_COLUMN` 过滤更容易利用索引。
