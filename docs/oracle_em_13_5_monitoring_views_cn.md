## 9. MGMT$METRIC_DETAILS

**视图说明**  
显示最近 **7 天滚动窗口**内的单条指标样本。包括最近一次已加载到 Repository 的样本，以及尚未聚合到小时级统计中的更早样本。

### 字段说明

| 字段 | 说明 |
|---|---|
| `TARGET_NAME` | 目标名称。 |
| `TARGET_TYPE` | 目标类型。 |
| `TARGET_GUID` | 目标 GUID。 |
| `METRIC_NAME` | 指标名称。 |
| `METRIC_TYPE` | 指标类型解码值，如 `Number`、`String`、`Table`、`Raw`、`External`。 |
| `METRIC_COLUMN` | 表类型指标列名；非表类型一般为空格。 |
| `METRIC_LABEL` | 指标显示名称。 |
| `COLUMN_LABEL` | 指标列显示名称。 |
| `COLLECTION_TIMESTAMP` | 该样本的采集时间。 |
| `VALUE` | 指标值，以字符串形式返回；若限定为数值型指标，可在 SQL 中使用 `TO_NUMBER`。 |
| `KEY_VALUE` ~ `KEY_VALUE5` | 样本对应的键值，复合键时按顺序记录。 |

### 使用提示

- 用于查看指标随时间变化的逐点样本。
- 适合定位异常采样时间段。
- 可用于相关性分析，或将指标样本与告警时间对齐。
- 按 `TARGET_NAME`、`TARGET_TYPE`、`METRIC_NAME`、`METRIC_COLUMN`、`KEY_VALUE` 或 `COLLECTION_TIMESTAMP` 过滤时更容易利用索引。

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


COLUMN_LABEL有如下类型：
Active State
Archiver
Database Status
Audited User Session Count
State
Status
Free Archive Area (KB)
Total Archive Area (KB)
Archive Area Used (KB)
Archive Area Used (%)
Average Wait Time (millisecond)
Average Foreground Wait Time (millisecond)
Average Active Sessions
Average Synchronous Single-Block Read Latency (ms)
Average Instance CPU (%)
Average Users Waiting Count
BG Checkpoints (per second)
Branch Node Splits (per second)
Branch Node Splits (per transaction)
Buffer Cache Hit (%)
Buffer Cache(MB)
Tablespace Free Space (MB) (Undo)
Tablespace Free Space (MB) (Undo)
Tablespace Free Space (MB) (Undo)
User Commits (per second)
User Commits (per transaction)
Consistent Read Changes (per second)
Consistent Read Changes (per transaction)
Consistent Read Gets (per second)
Consistent Read Gets (per transaction)
containerName
Database CPU Time (%)
CPU Usage (per second)
CPU Usage (per transaction)
Consistent Read Blocks Created (per second)
Consistent Read Blocks Created (per transaction)
Consistent Read Undo Records Applied (per second)
Consistent Read Undo Records Applied (per transaction)
Cursor Cache Hit (%)
dbDomain
Database Block Changes (per second)
Database Block Changes (per transaction)
Database Block Gets (per second)
Database Block Gets (per transaction)
Database Time (centiseconds per second)
Database Time (centiseconds per transaction)
Database Time Spent Waiting (%)
DBWR Checkpoints (per second)
Data Dictionary Hit (%)
Row Cache Miss Ratio (%)
Free Dump Area (KB)
Dump Area Directory
Total Dump Area (KB)
Dump Area Used (KB)
Dump Area Used (%)
Enqueue Deadlocks (per second)
Enqueue Deadlocks (per transaction)
Enqueue Requests (per second)
Enqueue Requests (per transaction)
Enqueue Timeout (per second)
Enqueue Timeout (per transaction)
Enqueue Waits (per second)
Enqueue Waits (per transaction)
Executes Performed without Parses (%)
Executes (per second)
Executes (per transaction)
Parse Failure Count (per second)
Parse Failure Count (per transaction)
Final Change Number
Fixed SGA(MB)
Fast Recovery Area
Fast Recovery Area Size
Flashback On
Hard Parses (per second)
Hard Parses (per transaction)
Host CPU Utilization (%)
Full Index Scans (per second)
Full Index Scans (per transaction)
Total Index Scans (per second)
Total Index Scans (per transaction)
Sorts in Memory (%)
Inmemory Populate
Inmemory Query
I/O Megabytes (per second)
I/O Requests (per second)
isAppPdb
isAppPdb
isAppRoot
isAppRoot
Java Pool Free (%)
Java Pool(MB)
Large Pool Free (%)
Large Pool(MB)
Last Successful Archived Log Backup Date
Last Successful Archived Log Backup Media
Last Complete Disk Backup
Last Complete Media Backup
Last Successful Full Backup Date
Last Successful Full Backup Media
Last Executed Archived Log Backup Date
Last Executed Archived Log Backup Status
Last Executed Full Backup Date
Last Executed Full Backup Status
Last Executed Incremental Backup Date
Last Executed Incremental Backup Status
Last Executed Incremental Level 0 Backup Status
Last Successful Incremental Backup Date
Last Successful Incremental Backup Media
Last Successful Incremental Level 0 Backup Media
Leaf Node Splits (per second)
Leaf Node Splits (per transaction)
Library Cache Hit (%)
Library Cache Miss (%)
Log Buffer(MB)
Log Mode
Current Logons Count
Cumulative Logons (per second)
Cumulative Logons (per transaction)
Session Logical Reads (per second)
Session Logical Reads (per transaction)
Audited Host
Maximum Blocked DB Time (seconds)
Maximum Blocked Session Count
Network Bytes (per second)
Non-reclaimable Fast Recovery Area (%)
Oldest Flashback Time
Current Open Cursors Count
Open Cursors (per second)
Open Cursors (per transaction)
Optimal SGA Size (MB)
Other SGA Memory(MB)
Active Sessions Waiting: Other
Total Parses (per second)
Total Parses (per transaction)
Tablespace Space Used (%) (Undo)
pdbGuid
pdbGuid
pdbName
pdbName
PGA Total(MB)
PGA Cache Hit (%)
Physical Reads (per second)
Physical Reads (per transaction)
Physical Reads Direct (per second)
Physical Reads Direct (per transaction)
Physical Reads Direct Lobs (per second)
Physical Reads Direct Lobs (per transaction)
Physical Writes (per second)
Physical Writes (per transaction)
Physical Writes Direct (per second)
Physical Writes Direct (per transaction)
Physical Writes Direct Lobs (per second)
Physical Writes Direct Lobs (per transaction)
Process Limit Usage (%)
Parallel Execution Downgraded 25% or more (per second)
Parallel Execution Downgraded to Serial (per second)
Parallel Execution Downgraded to Serial (per transaction)
Reclaimable Fast Recovery Area (%)
Recovery Appliance
Recovery Appliance Downstream Two
Recursive Calls (per second)
Recursive Calls (per transaction)
Redo Log Allocation Hit (%)
Redo Generated (per second)
Redo Generated (per transaction)
Redo Writes (per second)
Redo Writes (per transaction)
Regular CPU
Recovery Appliance Downstream One
Recovery Appliance Replication Server List
Response Time (per transaction)
User Rollbacks (per second)
User Rollbacks (per transaction)
Rows Processed (per sort)
Disk Recovery Window (seconds)
Disk Recovery Window Goal(seconds)
Media Recovery Window (seconds)
Max SCN Jump Time (GMT)
Session Limit Usage (%)
SGA Size(MB)
Shared Pool Free (%)
Shared Pool(MB)
Soft Parse (%)
Sorts to Disk (per second)
Sorts to Disk (per transaction)
Sorts in memory (per second)
Sorts in memory (per transaction)
Rows sorted (per second)
Rows sorted (per transaction)
Streams Pool(MB)
Scans on Long Tables (per second)
Scans on Long Tables (per transaction)
Total Table Scans (per second)
Total Table Scans (per transaction)
Response Time (centi-seconds per call)
Total Wait Time (second)
Total Foreground Wait Time (second)
Total Number of Waits
Total Number of Foreground Waits
Total Memory Usage (MB)
Number of Transactions (per second)
Disk Unprotected Data Window (seconds)
Disk Unprotected Data Window Threshold (seconds)
Media Unprotected Data Window (seconds)
Usable Fast Recovery Area (%)
Active Sessions Using CPU
User Limit Usage (%)
Wait Time (%)
User Calls (%)
User Calls (per second)
User Calls (per transaction)
Active Sessions Waiting: I/O
Audited User
User Rollback Undo Records Applied (per second)
User Rollback Undo Records Applied (per transaction)
Wait Class Name