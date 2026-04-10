# OMR + NL2SQL MVP 设计说明（当前实现对齐版）

更新时间：2026-04-10

## 1. 目标与边界

本阶段目标：
- 在不删除、不破坏原有 REST 取数路径的前提下，新增 OMR 直连取数路径。
- 为 OMR 路径提供 NL2SQL（模板优先，LLM 兜底）能力。
- 保持 `fetch_data_from_oem` 与 `run_skill` 两个 MCP 工具的输入输出契约不变。

明确边界：
- 当前先支持 Oracle OMR。
- 先支持三张核心白名单视图：
  - `MGMT$TARGET`
  - `SYSMAN.MGMT$METRIC_CURRENT`
  - `MGMT$INCIDENTS`
- 只读，不执行写操作。

---

## 2. 配置设计

在 `config/metric_map.yaml` 中新增：

```yaml
data_source:
  mode: "omr_db"   # rest | omr_db

omr_db:
  username: ""
  password: ""
  dsn: ""
  schema: "SYSMAN"
```

说明：
- `mode=rest`：走原有 REST 逻辑。
- `mode=omr_db`：走 OMR 直连逻辑。
- `dsn` 原样透传给 `oracledb.connect(..., dsn=...)`。
  - 推荐格式：`host:port/service_name`
  - 复杂场景可用 DESCRIPTION 连接串。

---

## 3. 核心实现结构

### 3.1 Service 层路由

`AskOpsService.fetch_data()` 增加源选择：
- `omr_db` -> `_fetch_data_from_omr()`
- 其它 -> 维持原 `REST` 分支

### 3.2 OMR 客户端

`src/omr_client.py` 提供：
- `list_targets()`：查询目标清单
- `list_metric_groups()`：查询目标可见监控项
- `list_recent_incidents()`：查询近期/未关闭 incidents
- `fetch_bundle()`：返回与现有数据层兼容的 bundle
- `execute_sql()`：供 NL2SQL 执行 SQL

### 3.3 NL2SQL 引擎

`src/nl2sql_engine.py`：
- 模板优先：常见问题直接生成固定 SQL
- LLM 兜底：模板未命中时由 LLM 生成
- 安全校验：
  - 必须是 `SELECT`
  - 禁止分号
  - 禁止 DDL/DML
  - 必须命中白名单视图

### 3.4 run_skill 行为修正（已落地）

对于“目标清单/监控项清单”这类非诊断问题：
- `run_skill_with_llm()` 直接返回内置格式化结果
- 不再进入 Skill 路由，避免返回“目标: 未指定...”的无效摘要
- 有效减少工具链路循环和 tool round 过深问题

---

## 4. 三张核心视图映射

### 4.1 MGMT$TARGET
- 场景：列目标、按类型筛选
- 常用字段：`target_name`, `target_type`, `display_name`, `host_name`, `last_load_time_utc`

### 4.2 SYSMAN.MGMT$METRIC_CURRENT
- 场景：当前指标值、监控项清单
- 常用字段：`target_name`, `target_type`, `metric_name`, `metric_column`, `collection_timestamp`, `value`

### 4.3 MGMT$INCIDENTS
- 场景：当前告警、近期告警
- 常用字段：`incident_num`, `summary_msg`, `severity`, `priority`, `open_status`, `last_updated_date`
- 查询建议：优先结合 `OPEN_STATUS`、`CLOSED_DATE` 过滤

---

## 5. 工具行为（当前版本）

### `fetch_data_from_oem`
- 依旧返回结构化 `intent/routing/data`
- 在 `omr_db` 模式下，`data.*` 来源于 OMR

### `run_skill`
- 先执行 `fetch_data`
- 对清单类问题，直接走内置结果格式化
- 对诊断类问题，继续走 Skill Engine；未命中则降级摘要

---

## 6. 测试与验证（当前已执行）

已加入自动化测试：
- `tests/test_nl2sql_engine.py`
  - 模板命中（中英文）
  - SQL 安全校验
- `tests/test_service_omr_mode.py`
  - OMR 模式下目标清单
  - need_follow_up 触发 NL2SQL
  - run_skill 清单查询直出内置回复

建议继续补充的集成测试：
- 真库连通性（Oracle 网络、账号权限）
- 中英文混合问题的 NL2SQL 准确率
- OMR/REST 切换回归

---

## 7. 下一步建议

1. 扩展 few-shot 样例（结合更多实际问法）
2. 增加 SQL 执行前 explain/成本保护（可选）
3. 增加 query_timeout / row_limit 配置化
4. 结合真实 OMR 数据补充端到端回归集

