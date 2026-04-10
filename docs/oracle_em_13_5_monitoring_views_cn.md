# Oracle EM 13.5 Monitoring Views（Markdown整理）

> 依据 Oracle 官方文档 **Cloud Control Management Repository Views Reference → Monitoring Views** 页面整理。  
> 本文件按页面顺序汇总了各视图的用途说明、主要字段说明和使用提示。  
> 说明采用中文整理，字段名保留 Oracle 原名，便于直接对照查询。

## 目录

1. `MGMT$ALERT_CURRENT`
2. `MGMT$TARGET_METRIC_SETTINGS`
3. `MGMT$TARGET_COLLECTIONS`
4. `MGMT$TEMPLATE_COLLECTIONS`
5. `MGMT$AVAILABILITY_CURRENT`
6. `MGMT$AVAILABILITY_HISTORY`
7. `MGMT$ALERT_HISTORY`
8. `MGMT$AVAIL_ALERT_HISTORY`
9. `MGMT$METRIC_DETAILS`
10. `MGMT$METRIC_CURRENT`
11. `MGMT$METRIC_HOURLY`
12. `MGMT$METRIC_DAILY`

---

## 1. MGMT$ALERT_CURRENT

**视图说明**  
显示当前仍处于**非 Clear 状态**的告警。对于同一指标，只保留最近一次仍未清除的打开告警。

### 字段说明

| 字段 | 说明 |
|---|---|
| `TARGET_NAME` | 采集到该指标的目标名称。 |
| `TARGET_TYPE` | 目标类型，决定该目标适用的指标集合。 |
| `TARGET_GUID` | 目标的全局唯一标识。 |
| `VIOLATION_GUID` | 告警的唯一标识。 |
| `METRIC_NAME` | 指标内部名称。 |
| `METRIC_COLUMN` | 表类型指标的列名；非表类型指标通常是单个空格。 |
| `METRIC_LABEL` | 指标的可读显示名称。 |
| `COLUMN_LABEL` | 表类型指标列的可读显示名称。 |
| `KEY_VALUE` ~ `KEY_VALUE7` | 告警对应的主键值；复合键时依次存放第 1~7 部分。 |
| `COLLECTION_TIMESTAMP` | Agent 检测到告警条件的时间。 |
| `ALERT_STATE` | 告警状态文本，如 `Warning`、`Critical`。若已恢复为 Clear，则不会出现在本视图。 |
| `VIOLATION_TYPE` | 告警类型，如阈值告警、可用性告警、策略违规。 |
| `MESSAGE` | 告警附加消息。 |
| `MESSAGE_NLSID` | 告警消息的 NLS ID。 |
| `MESSAGE_PARAMS` | 用于格式化告警消息的 URL 编码参数。 |
| `ACTION_MESSAGE` | 建议处理动作（英文）。 |
| `ACTION_MESSAGE_NLSID` | 动作消息的 NLS ID。 |
| `ACTION_MESSAGE_PARAMS` | 用于翻译/格式化动作消息的参数。 |
| `TYPE_DISPLAY_NAME` | 目标类型在 UI 中的显示名称。 |
| `METRIC_GUID` | 对应指标的全局唯一标识。 |
| `EVENT_INSTANCE_ID` | 该告警对应的事件 ID，可用于关联事件视图。 |
| `VIOLATION_LEVEL` | 违规级别，如 `Clear`、`Warning`、`Critical`、`Informational`、`Metric Error` 等。 |
| `CURRENT_VALUE` | 触发违规时采集到的当前值。 |

### 使用提示

- 适合查看当前未恢复的告警。
- 若只关心当前非 Clear 告警，相比更细粒度的明细视图，本视图性能更好。
- 若按 `TARGET_NAME`、`TARGET_TYPE`、`METRIC_NAME`、`METRIC_COLUMN` 过滤，通常能更好利用索引。

---

## 2. MGMT$TARGET_METRIC_SETTINGS

**视图说明**  
显示 Management Repository 中所有目标当前的指标设置，既包括 Agent 端指标，也包括 Repository 端指标。

### 字段说明

| 字段 | 说明 |
|---|---|
| `TARGET_NAME` | 目标名称。 |
| `TARGET_TYPE` | 目标类型。 |
| `TARGET_GUID` | 目标 GUID。 |
| `METRIC_NAME` | 指标名称。 |
| `METRIC_COLUMN` | 表类型指标的列名；非表类型通常为空格。 |
| `METRIC_GUID` | 指标/指标列的 GUID。 |
| `COLLECTION_NAME` | 采集项名称。 |
| `CATEGORY` | 指标所属分类，可与 `MGMT$METRIC_CATEGORIES` 对照。 |
| `KEY_VALUE` ~ `KEY_VALUE7` | 设置项对应的键值；如果阈值适用于全部行，通常为空格。 |
| `KEY_OPERATOR` | 标识 `KEY_VALUE` 是否使用通配符；多键场景下会按键顺序记录匹配方式。 |
| `HAS_ACTIVE_BASELINE` | 标志该键值行是否存在活动基线；有活动基线时，用户更新阈值/参数可能被忽略。 |
| `PREVENT_OVERRIDE` | 模板覆盖保护标志；开启后，模板重新下发不会覆盖该设置。 |
| `WARNING_OPERATOR` | Warning 阈值比较操作符，如 GT、EQ、LT、LE、GE、CONTAINS、NE、正则匹配。 |
| `WARNING_THRESHOLD` | Warning 阈值。 |
| `CRITICAL_OPERATOR` | Critical 阈值比较操作符。 |
| `CRITICAL_THRESHOLD` | Critical 阈值。 |
| `OCCURRENCE_COUNT` | 触发多少次后才真正产生违规。 |
| `WARNING_ACTION_TYPE` | Warning 级别的处理动作类型。 |
| `WARNING_ACTION_JOB_TYPE` | Warning 级别的纠正动作作业类型。 |
| `WARNING_ACTION_JOB_OWNER` | Warning 级别纠正动作的作业 Owner。 |
| `WARNING_ACTION_JOB_NAME` | Warning 级别纠正动作的作业名称。 |
| `CRITICAL_ACTION_TYPE` | Critical 级别的处理动作类型，如不处理、Repository 端纠正动作、Agent Fixit Job。 |
| `CRITICAL_ACTION_JOB_TYPE` | Critical 级别纠正动作的作业类型。 |
| `CRITICAL_ACTION_JOB_OWNER` | Critical 级别纠正动作的作业 Owner。 |
| `CRITICAL_ACTION_JOB_NAME` | Critical 级别纠正动作的作业名称。 |
| `COLUMN_LABEL` | 指标列的显示名称。 |
| `WARN_ACTION_JOB_ID` | Warning 纠正动作作业 ID。 |
| `CRIT_ACTION_JOB_ID` | Critical 纠正动作作业 ID。 |
| `WARN_ACTION_JOB_DESCRIPTION` | Warning 纠正动作作业说明。 |
| `CRIT_ACTION_JOB_DESCRIPTION` | Critical 纠正动作作业说明。 |

### 使用提示

- 查看某目标的全部指标阈值与设置。
- 查看某个目标 + 某个指标的详细设置。
- 查看已绑定的纠正动作。

---

## 3. MGMT$TARGET_COLLECTIONS

**视图说明**  
显示已为目标配置的指标采集项信息。

### 字段说明

| 字段 | 说明 |
|---|---|
| `TARGET_NAME` | 目标名称。 |
| `TARGET_TYPE` | 目标类型。 |
| `TARGET_GUID` | 目标唯一 ID。 |
| `COLL_NAME` | 采集项名称。 |
| `METRIC_GROUP_GUID` | 与该采集项关联的指标 GUID。 |
| `METRIC_GROUP_LABEL` | 与该采集项关联的指标显示名称。 |
| `IS_REPOSITORY` | 是否为 Repository 端采集。 |
| `STORE_METRIC` | 是否将返回值写入 `MGMT_METRIC_RAW`；`Y` 表示存储，`N` 表示不存储。 |
| `INTERVAL` | 采集执行间隔。 |
| `TIME_UNIT` | 采集间隔的时间单位。 |
| `DISABLED` | 采集项是否已禁用。 |
| `UPLOAD_FREQUENCY` | 对 Agent 端指标，表示采集多少次后上传到 OMS。 |
| `FREQUENCY` | 采集频率代码。 |

---

## 4. MGMT$TEMPLATE_COLLECTIONS

**视图说明**  
显示模板中定义的指标采集配置。

### 字段说明

| 字段 | 说明 |
|---|---|
| `TEMPLATE_NAME` | 模板名称。 |
| `TARGET_TYPE` | 模板适用的目标类型。 |
| `TEMPLATE_GUID` | 模板 GUID。 |
| `METRIC_NAME` | 被模板配置的指标名称。 |
| `METRIC_COLUMN` | 被模板配置的指标列名。 |
| `METRIC_GUID` | 指标列 GUID。 |
| `COLLECTION_NAME` | 采集名称。 |
| `IS_REPOSITORY` | 是否为 Repository 端采集。 |
| `FREQUENCY_CODE` | 采集频率类型代码：1 一次性、2 间隔、3 每日、4 每周、5 每月、6 每年、7 On Demand。 |
| `COLLECTION_FREQUENCY` | 采集频率的具体值：一次性时存开始时间；Interval 时存分钟数；日/周/月/年时存 HH24:MI；按需时显示 On-Demand。 |
| `UPLOAD_POLICY` | 指标数据上传/存储策略。 |

---

## 5. MGMT$AVAILABILITY_CURRENT

**视图说明**  
显示当前最新的目标可用性状态。

### 字段说明

| 字段 | 说明 |
|---|---|
| `TARGET_NAME` | 目标名称。 |
| `TARGET_TYPE` | 目标类型。 |
| `TARGET_GUID` | 目标 GUID。 |
| `START_TIMESTAMP` | 当前这次可用性状态变化首次被检测到的时间。 |
| `AVAILABILITY_STATUS` | 当前状态，如 `Target Down`、`Target Up`、`Metric Error`、`Agent Down`、`Unreachable`、`Blackout`、`Pending/Unknown`。 |
| `AVAILABILITY_STATUS_CODE` | 与可用性状态对应的数字代码（0~6）。 |
| `TYPE_DISPLAY_NAME` | 目标类型在 UI 中的显示名称。 |

### 使用提示

- 获取目标的当前可用性状态。

---

## 6. MGMT$AVAILABILITY_HISTORY

**视图说明**  
显示目标可用性状态变化的历史记录。

### 字段说明

| 字段 | 说明 |
|---|---|
| `TARGET_NAME` | 目标名称。 |
| `TARGET_TYPE` | 目标类型。 |
| `TARGET_GUID` | 目标 GUID。 |
| `START_TIMESTAMP` | 该状态开始时间。 |
| `END_TIMESTAMP` | 该状态结束时间。 |
| `AVAILABILITY_STATUS` | 历史状态值，如 `Target Down`、`Target Up`、`Metric Error`、`Agent Down`、`Unreachable`、`Blackout`、`Pending/Unknown`。 |

### 使用提示

- 适合分析一段时间内可用性状态切换情况。
- 按 `TARGET_NAME`、`TARGET_TYPE`、`START_TIMESTAMP` 过滤时更容易使用索引。

---

## 7. MGMT$ALERT_HISTORY

**视图说明**  
显示已记录到 Repository 的历史告警信息。

### 字段说明

| 字段 | 说明 |
|---|---|
| `TARGET_NAME` | 目标名称。 |
| `TARGET_TYPE` | 目标类型。 |
| `TARGET_GUID` | 目标 GUID。 |
| `VIOLATION_GUID` | 告警 GUID。 |
| `METRIC_NAME` | 指标名称。 |
| `METRIC_COLUMN` | 表类型指标列名；非表类型一般为空格。 |
| `METRIC_LABEL` | 指标显示名称。 |
| `COLUMN_LABEL` | 指标列显示名称。 |
| `KEY_VALUE` ~ `KEY_VALUE7` | 复合键的各组成部分。 |
| `COLLECTION_TIMESTAMP` | Agent 检测到告警条件的时间。 |
| `ALERT_STATE` | 告警状态，如 Warning、Critical。 |
| `ALERT_DURATION` | 告警持续时长（小时）。 |
| `MESSAGE` | 告警消息。 |
| `MESSAGE_NLSID` | 告警消息 NLS ID。 |
| `MESSAGE_PARAMS` | 告警消息格式化参数。 |
| `ACTION_MESSAGE` | 建议处理动作。 |
| `ACTION_MESSAGE_NLSID` | 动作消息 NLS ID。 |
| `ACTION_MESSAGE_PARAMS` | 动作消息参数。 |
| `VIOLATION_TYPE` | 违规类型，如 Threshold Violation、Availability、Policy Violation。 |
| `TYPE_DISPLAY_NAME` | 目标类型显示名称。 |
| `METRIC_GUID` | 对应指标 GUID。 |
| `EVENT_INSTANCE_ID` | 事件实例 ID，可关联事件视图。 |
| `CYCLE_GUID` | Oracle 内部使用字段。 |
| `COLUMN_LABEL_NLSID` | Oracle 内部使用字段。 |
| `VIOLATION_LEVEL` | 违规级别，如 Clear、Warning、Critical、Informational、Unreachable、Blackout、Metric Error 等。 |
| `CURRENT_VALUE` | 违规发生时采集到的值。 |

---

## 8. MGMT$AVAIL_ALERT_HISTORY

**视图说明**  
显示响应类告警（response alerts）的历史信息。

### 字段说明

| 字段 | 说明 |
|---|---|
| `TARGET_NAME` | 目标名称。 |
| `TARGET_TYPE` | 目标类型。 |
| `TARGET_GUID` | 目标 GUID。 |
| `VIOLATION_GUID` | 违规记录 GUID。 |
| `VIOLATION_LEVEL` | 违规优先级，例如 `15: clear`、`20: warning`、`25: alert`。 |
| `CYCLE_GUID` | 同一严重度生命周期中第一条违规的 GUID。 |
| `METRIC_NAME` | 指标名称。 |
| `METRIC_COLUMN` | 表类型指标列名；非表类型一般为空格。 |
| `METRIC_GUID` | 指标列 GUID。 |
| `METRIC_LABEL` | 指标显示名称。 |
| `COLUMN_LABEL` | 指标列显示名称。 |
| `COLLECTION_TIMESTAMP` | Agent 检测到告警的时间。 |
| `ALERT_STATE` | 告警状态，如 Warning、Critical。 |
| `ALERT_DURATION` | 告警持续时间（小时）。 |
| `MESSAGE` | 告警消息。 |
| `MESSAGE_NLSID` | 告警消息 NLS ID。 |
| `MESSAGE_PARAMS` | 告警消息参数。 |
| `ACTION_MESSAGE` | 建议动作消息。 |
| `ACTION_MESSAGE_NLSID` | 动作消息 NLS ID。 |
| `ACTION_MESSAGE_PARAMS` | 动作消息参数。 |
| `VIOLATION_TYPE` | 违规类型，例如阈值、可用性、策略违规。 |
| `TYPE_DISPLAY_NAME` | 目标类型显示名称。 |

---

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

> 注：官方页面特别提示：若 Repository 数据库使用 19c 或更高版本，请参考 MOS Note 2801775。

---

## 10. MGMT$METRIC_CURRENT

**视图说明**  
显示已加载到 Repository 中的**最新指标值**。

### 字段说明

| 字段 | 说明 |
|---|---|
| `TARGET_NAME` | 目标名称。 |
| `TARGET_TYPE` | 目标类型。 |
| `TARGET_GUID` | 目标 GUID。 |
| `METRIC_NAME` | 指标名称。 |
| `METRIC_TYPE` | 指标类型解码值：`Number`、`String`、`Table`、`Raw`、`External`。 |
| `METRIC_COLUMN` | 表类型指标列名；非表类型一般为空格。 |
| `METRIC_LABEL` | 指标显示名称。 |
| `COLUMN_LABEL` | 指标列显示名称。 |
| `COLLECTION_TIMESTAMP` | 最新值被采集/检测到的时间。 |
| `VALUE` | 最新指标值，按字符串返回；数值型场景可配合 `TO_NUMBER`。 |
| `KEY_VALUE` ~ `KEY_VALUE5` | 对应键值；复合键时为第 1~5 部分。 |

### 使用提示

- 用于查看某目标某指标当前的最新值。
- 适合做当前状态快照查询。
- 按 `TARGET_NAME`、`TARGET_TYPE`、`METRIC_NAME`、`METRIC_COLUMN`、`KEY_VALUE` 或 `COLLECTION_TIMESTAMP` 过滤时更容易利用索引。

> 注：官方页面特别提示：若 Repository 数据库使用 19c 或更高版本，请参考 MOS Note 2801775。

---

## 11. MGMT$METRIC_HOURLY

**视图说明**  
显示按小时聚合后的指标统计。举例来说，如果某指标每 15 分钟采集一次，则 1 小时聚合会把 4 个样本汇总成 1 条小时记录。当前小时的数据可能不会立刻可见。

### 字段说明

| 字段 | 说明 |
|---|---|
| `TARGET_NAME` | 目标名称。 |
| `TARGET_TYPE` | 目标类型。 |
| `TARGET_GUID` | 目标 GUID。 |
| `METRIC_NAME` | 指标名称。 |
| `METRIC_COLUMN` | 表类型指标列名；非表类型一般为空格。 |
| `METRIC_LABEL` | 指标显示名称。 |
| `COLUMN_LABEL` | 指标列显示名称。 |
| `KEY_VALUE` ~ `KEY_VALUE5` | 聚合记录对应的键值。 |
| `ROLLUP_TIMESTAMP` | 小时聚合周期的起始时间。 |
| `SAMPLE_COUNT` | 本次聚合中参与统计的非空样本数。 |
| `AVERAGE` | 聚合周期内样本平均值。 |
| `MINIMUM` | 聚合周期内样本最小值。 |
| `MAXIMUM` | 聚合周期内样本最大值。 |
| `STANDARD_DEVIATION` | 聚合周期内样本标准差。 |

### 使用提示

- 适合看一天内指标的小时级变化。
- 适合找出某指标在哪些小时段达到峰值。
- 适合分析 1 小时窗口内波动程度。
- 适合在发现某个异常小时后，进一步回看该小时各指标取值。

> 注：官方页面特别提示：若 Repository 数据库使用 19c 或更高版本，请参考 MOS Note 2801775。

---

## 12. MGMT$METRIC_DAILY

**视图说明**  
显示按天聚合后的指标统计，即过去 24 小时样本汇总后的结果。页面说明该视图的数据时效取决于查询时点以及小时聚合表的刷新时间。

### 字段说明

| 字段 | 说明 |
|---|---|
| `TARGET_NAME` | 目标名称。 |
| `TARGET_TYPE` | 目标类型。 |
| `TARGET_GUID` | 目标 GUID。 |
| `METRIC_NAME` | 指标名称。 |
| `METRIC_COLUMN` | 表类型指标列名；非表类型一般为空格。 |
| `METRIC_LABEL` | 指标显示名称。 |
| `COLUMN_LABEL` | 指标列显示名称。 |
| `KEY_VALUE` ~ `KEY_VALUE5` | 聚合记录对应的键值。 |
| `ROLLUP_TIMESTAMP` | 聚合周期起始时间。 |
| `SAMPLE_COUNT` | 参与聚合的非空样本数。 |
| `AVERAGE` | 聚合周期平均值。 |
| `MINIMUM` | 聚合周期最小值。 |
| `MAXIMUM` | 聚合周期最大值。 |
| `STANDARD_DEVIATION` | 聚合周期标准差。 |

### 使用提示

- 适合按天观察一周或一月范围内的变化趋势。
- 适合做趋势分析。
- 按 `TARGET_NAME`、`METRIC_NAME` 或 `ROLLUP_TIMESTAMP` 过滤时更容易利用索引。

> 注：官方页面特别提示：若 Repository 数据库使用 19c 或更高版本，请参考 MOS Note 2801775。

---

## 补充说明

- 本整理文件基于 Oracle 官方 13.5 文档页面内容做了中文归纳，不包含示例 SQL。
- 原文部分字段说明存在重复或轻微排版问题，本文件已按语义做整理，使其更便于查阅。
- 若你后续需要，可以继续扩展成：
  - 按用途分类（告警 / 可用性 / 指标 / 聚合）
  - 增加常用 SQL 示例
  - 面向 DBA 的速查手册版本