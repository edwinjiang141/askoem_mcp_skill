# Oracle Enterprise Manager 13.5 Events Views 整理（Markdown）

## 来源
- Oracle 官方文档：Events Views
- 版本：Enterprise Manager Cloud Control 13.5
- 页面主题：事件相关 Repository Views 的说明、字段说明与使用提示

> 说明：
> - 下文按官方页面顺序整理。
> - 保留视图名和字段名原文，字段说明改写为中文，尽量贴近官方原意。
> - 官方多次强调：查询这些分区相关视图时，应优先在条件中使用 `OPEN_STATUS` 和 `CLOSED_DATE` 过滤，以便利用分区。
> - `MGMT$EVENTS` 页面特别说明：其中所有日期列都按 **UTC** 标准化，使用时需要按目标时区转换。

---

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
| IS_ESCALATED | 是否已升级。`1`=是，`0`=否。 |
| ESCALATION_LEVEL | 升级级别，范围为 1 到 5。 |
| PRIORITY | Incident 的优先级。可选值：`None`、`Urgent`、`Very High`、`High`、`Medium`、`Low`。 |
| RESOLUTION_STATE | 问题的解决状态。 |
| OWNER | 问题所有者；如果没有 owner，则为 `-`。 |
| IS_ACKNOWLEDGED | 是否已确认。`1`=是，`0`=否。 |
| IS_SUPPRESSED | 是否已抑制。`1`=是，`0`=否。 |
| LAST_ANNOTATION_SEQ | 最后一条注释的序号。 |
| CREATION_DATE | Incident 创建时间。 |
| LAST_UPDATED_DATE | Incident 最后更新时间。 |
| EVENT_COUNT | 与该 Incident 关联的事件数量。 |
| OPEN_STATUS | Incident 状态。`1`=Open，`0`=Closed。 |
| CLOSED_DATE | Incident 关闭时间；若未关闭则为空。 |
| SRC_COUNT | 该 Incident 中涉及的唯一 target/source object 组合数量。 |
| TARGET_GUID | 与 Incident 关联的 target 唯一 ID。只有当 Incident 中所有事件都属于同一个 target 或 source object 组合时才有值；多来源时为 `NULL`。 |
| SOURCE_OBJ_TYPE | 所有关联事件对应的 source object/entity 类型；若来源不唯一则为 `NULL`。 |
| ADR_RELATED | 是否为 Oracle Diagnostic Incident。`1`=是，`0`=否。 |
| TICKET_ID | 与该 Incident 关联的工单 ID，可为空。 |
| TICKET_STATUS | 工单状态，可为空。 |
| SR_ID | 与该问题关联的 Service Request ID（如果有）。 |
| PROBLEM_ID | 关联 Problem 的唯一 RAW ID（如果有）。 |
| PROBLEM_NUM | 关联 Problem 的最终用户可见编号（如果有）。 |

---

## 2. MGMT$INCIDENT_CATEGORY

### 视图说明
`MGMT$INCIDENT_CATEGORY` 是 Incident 与 Category 的映射视图。一个 Incident 可以关联多个 Category。

### 使用提示
查询时建议优先对 `OPEN_STATUS` 和 `CLOSED_DATE` 过滤，以利用分区。

### 字段说明
| 字段 | 说明 |
|---|---|
| INCIDENT_ID | Incident 的唯一 RAW ID。 |
| CATEGORY_NAME | Category 名称。 |
| OPEN_STATUS | Incident 状态。`1`=Open，`0`=Closed。 |
| CLOSED_DATE | Incident 关闭时间。 |

---

## 3. MGMT$INCIDENT_TARGET

### 视图说明
`MGMT$INCIDENT_TARGET` 是 Incident 与 Target 的映射视图。一个 Incident 可以由多个事件组成，而这些事件可能来自不同 Target。

### 使用提示
查询时建议优先对 `OPEN_STATUS` 和 `CLOSED_DATE` 过滤，以利用分区。

### 字段说明
| 字段 | 说明 |
|---|---|
| INCIDENT_ID | Incident 的唯一 RAW ID。 |
| TARGET_GUID | Target 的唯一 ID，可为空。 |
| OPEN_STATUS | Incident 状态。`1`=Open，`0`=Closed。 |
| CLOSED_DATE | Incident 关闭时间。 |

---

## 4. MGMT$INCIDENT_ANNOTATION

### 视图说明
`MGMT$INCIDENT_ANNOTATION` 是 Incident 与 Annotation 的映射视图。每个 Incident 可以有多条注释。

### 使用提示
查询时建议优先对 `OPEN_STATUS` 和 `CLOSED_DATE` 过滤，以利用分区。

### 字段说明
| 字段 | 说明 |
|---|---|
| INCIDENT_ID | Incident 的唯一 RAW ID。 |
| ANNOTATION_SEQ | 注释添加顺序号。 |
| ANNOTATION_MSG | 注释内容。 |
| ANNOTATION_DATE | 注释时间戳。 |
| ANNOTATION_TYPE | 注释类型，表示是用户生成还是系统生成。可选值：`USER`、`SYSTEM`。 |
| ANNOTATION_USER | 添加注释的用户；若为系统生成，则值为 `-`。 |
| OPEN_STATUS | Incident 状态。`1`=Open，`0`=Closed。 |
| CLOSED_DATE | Incident 关闭时间。 |

---

## 5. MGMT$EVENTS_LATEST

### 视图说明
`MGMT$EVENTS_LATEST` 展示某个事件序列（event sequence）**最新状态**的详细信息。  
一个 sequence 表示同一来源、同一问题的一系列原始事件。例如同一主机 CPU 利用率从 warning 变 critical，再回到 warning，这三条 raw event 会被关联成一个 sequence，而最新状态为 warning。

### 使用提示
查询时建议优先对 `OPEN_STATUS` 和 `CLOSED_DATE` 过滤，以利用分区。

### 字段说明
| 字段 | 说明 |
|---|---|
| EVENT_SEQ_ID | Event sequence 的唯一 RAW ID。 |
| EVENT_ID | Sequence 中最新事件的唯一 RAW ID。 |
| EVENT_CLASS | 事件所属类别。 |
| SEVERITY | 事件严重级别。 |
| LAST_ANNOTATION_SEQ | 该 sequence 最后一条注释的序号。 |
| MSG | 事件消息。 |
| EVENT_NAME | 描述事件性质的内部事件名。 |
| INCIDENT_ID | 该事件所属 Incident 的 ID（如果有）。 |
| INCIDENT_NUM | 面向最终用户可见的 Incident 编号。 |
| TARGET_GUID | 该 sequence 所属 target 的 GUID；若与 target 无关，则为 `NULL`。 |
| SOURCE_OBJ_TYPE | 该 sequence 所属 source object/entity 的类型，默认 `NULL`。 |
| SOURCE_OBJ_ID | 该 sequence 所属 source object/entity 的 GUID，默认 `NULL`。 |
| OPEN_STATUS | 事件序列状态。如果最后一条事件的 severity 不是 clear，则 sequence 为 open。`1`=Open，`0`=Closed。 |
| CLOSED_DATE | 事件被标记为关闭（sequence 被清除）的时间。 |
| CREATION_DATE | Event sequence 创建时间。 |
| LAST_UPDATED_DATE | Event sequence 最后更新时间。 |

---

## 6. MGMT$EVENTS

### 视图说明
`MGMT$EVENTS` 展示某个事件序列中的**所有原始事件**明细。  
一个 sequence 表示同一来源、同一问题的一系列 raw event。

### 使用提示
查询时建议优先对 `OPEN_STATUS` 和 `CLOSED_DATE` 过滤，以利用分区。

### 特别说明
该视图中的所有日期字段都标准化为 **UTC 时区**。如果需要本地时间，查询时必须自行转换。

### 字段说明
| 字段 | 说明 |
|---|---|
| EVENT_SEQ_ID | Event sequence 的唯一 RAW ID。 |
| EVENT_ID | Event 的唯一 RAW ID。 |
| SIGNATURE_ID | 原始事件唯一签名的 ID，用于将多个 raw event 关联到一个 sequence。 |
| EVENT_CLASS | 事件所属类别。 |
| SEVERITY | 原始事件的严重级别。 |
| LAST_ANNOTATION_SEQ | 该 sequence 最后一条注释的序号。 |
| MSG | 事件消息。 |
| EVENT_NAME | 描述事件性质的内部事件名。 |
| INCIDENT_ID | 该事件所属 Incident 的 ID（如果适用）。 |
| INCIDENT_NUM | 面向最终用户可见的 Incident 编号。 |
| TARGET_GUID | 该事件所属 target 的 GUID；若 sequence 与 target 无关，则为 `NULL`。 |
| SOURCE_OBJ_TYPE | 该事件所属 source object/entity 的类型，默认 `NULL`。 |
| SOURCE_OBJ_ID | 该事件所属 source object/entity 的 GUID，默认 `NULL`。 |
| OPEN_STATUS | 事件序列状态。若最后一条事件 severity 非 clear，则 sequence 为 open。`1`=Open，`0`=Closed。 |
| CLOSED_DATE | 事件被标记为关闭，即 sequence 被清除的时间。 |
| REPORTED_DATE | 事件上报时间。 |

---

## 7. MGMT$EVENT_ANNOTATION

### 视图说明
`MGMT$EVENT_ANNOTATION` 是 Event 与 Annotation 的映射视图。每个事件可以有多条注释。

### 使用提示
查询时建议优先对 `OPEN_STATUS` 和 `CLOSED_DATE` 过滤，以利用分区。

### 特别说明
注释是**关联到 sequence**，而不是关联到单个 raw event。

### 字段说明
| 字段 | 说明 |
|---|---|
| EVENT_SEQ_ID | Event sequence 的唯一 RAW ID。 |
| EVENT_INSTANCE_ID | Event instance 的唯一 RAW ID。 |
| ANNOTATION_SEQ_NUM | 注释添加顺序号。 |
| ANNOTATION_DATE | 注释时间戳。 |
| ANNOTATION_TYPE | 注释类型，表示用户生成或系统生成。可选值：`USER`、`SYSTEM`。 |
| ANNOTATION_USER | 添加注释的用户。 |
| ANNOTATION_MSG | 注释内容。 |
| OPEN_STATUS | 事件序列状态。若最后一条事件 severity 非 clear，则 sequence 为 open。`1`=Open，`0`=Closed。 |
| CLOSED_DATE | 事件被标记关闭、即 sequence 被清除的时间。 |

---

## 8. MGMT$PROBLEMS

### 视图说明
`MGMT$PROBLEMS` 用于查看 Problem 的属性，包括摘要消息。

### 使用提示
查询时建议优先对 `OPEN_STATUS` 和 `CLOSED_DATE` 过滤，以利用分区。

### 字段说明
| 字段 | 说明 |
|---|---|
| PROBLEM_ID | Problem 的唯一 RAW ID。 |
| PROBLEM_NUM | 面向最终用户可见的 Problem 编号。 |
| SUMMARY_MSG | Problem 的摘要消息。 |
| SEVERITY | Problem 的严重级别。 |
| IS_ESCALATED | 是否已升级。`1`=是，`0`=否。 |
| ESCALATION_LEVEL | 若已升级，表示升级级别，范围 1 到 5。 |
| PRIORITY | 问题优先级。可选值：`None`、`Urgent`、`Very High`、`High`、`Medium`、`Low`。 |
| RESOLUTION_STATE | 问题的解决状态。 |
| OWNER | 问题所有者；若没有 owner，则为 `-`。 |
| IS_ACKNOWLEDGED | 是否已确认。`1`=是，`0`=否。 |
| IS_SUPPRESSED | 是否已抑制。`1`=是，`0`=否。 |
| LAST_ANNOTATION_SEQ | 最后一条注释的序号。 |
| CREATION_DATE | Problem 创建时间。 |
| LAST_UPDATED_DATE | Problem 最后更新时间。 |
| INC_COUNT | 与该 Problem 关联的 Incident 数量。 |
| OPEN_STATUS | Problem 状态。`1`=Open，`0`=Closed。 |
| CLOSED_DATE | Problem 关闭时间；若未关闭则为空。 |
| TARGET_GUID | Target 的唯一 ID，可为空。只有当该 Problem 下所有 Incident 都属于同一个 target/source object 组合时才有值；多来源时为 `NULL`。 |
| PROBLEM_KEY | 该 Problem 的唯一签名。 |
| SR_ID | 与该 Problem 关联的 Service Request ID（如果有）。 |
| BUG_ID | 与该 Problem 关联的 Bug ID（如果有）。 |

### 官方补充说明
当前这个版本中，Problem 只能关联到单个 Target。

---

## 9. MGMT$PROBLEM_ANNOTATION

### 视图说明
`MGMT$PROBLEM_ANNOTATION` 是 Problem 与 Annotation 的映射视图。每个 Problem 可以有多条注释。

### 使用提示
查询时建议优先对 `OPEN_STATUS` 和 `CLOSED_DATE` 过滤，以利用分区。

### 字段说明
| 字段 | 说明 |
|---|---|
| PROBLEM_ID | Problem 的唯一 RAW ID。 |
| ANNOTATION_SEQ | 注释添加顺序号。 |
| ANNOTATION_MSG | 注释内容。 |
| ANNOTATION_DATE | 注释时间戳。 |
| ANNOTATION_TYPE | 注释类型，用户或系统生成。有效值：`USER`、`SYSTEM`。 |
| ANNOTATION_USER | 添加注释的用户。 |
| OPEN_STATUS | Problem 状态。`1`=Open，`0`=Closed。 |
| CLOSED_DATE | Problem 关闭时间。 |

---

## 10. 页面中的共同使用建议（整理）

### 10.1 分区过滤
官方在多个事件/问题/事故相关视图上都强调：
- 查询时优先使用 `OPEN_STATUS`
- 再结合 `CLOSED_DATE`

这样可以更好地利用分区，提高查询效率。

### 10.2 时间字段
对 `MGMT$EVENTS`，官方特别说明：
- 日期字段使用 **UTC** 归一化存储
- 使用时需要按目标时区做转换

### 10.3 关系理解
- `MGMT$EVENTS_LATEST`：看一个 sequence 的**最新状态**
- `MGMT$EVENTS`：看 sequence 中的**所有 raw events**
- `MGMT$EVENT_ANNOTATION`：注释实际挂在 **sequence** 上，而不是单条 raw event
- `MGMT$INCIDENT_*`：围绕 incident 的属性与映射
- `MGMT$PROBLEMS` / `MGMT$PROBLEM_ANNOTATION`：围绕 problem 及其注释

---

## 11. 原始参考链接
- https://docs.oracle.com/en/enterprise-manager/cloud-control/enterprise-manager-cloud-control/13.5/emvws/events-views.html

