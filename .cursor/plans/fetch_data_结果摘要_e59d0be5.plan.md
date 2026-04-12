---
name: fetch_data 结果摘要
overview: 在服务端为 `fetch_data_from_oem` 的成功与失败路径，在现有 `report` 中增加一段**仅由返回数据推导**的「数据摘要」（行数、列名、可选统计），不引入 LLM，避免篡改含义；可选在 MCP 顶层增加 `result_summary` 字段便于程序消费。
todos:
  - id: impl-summary-fn
    content: 在 service.py 实现 _build_fetch_data_fact_summary(fetched) 与子查询分支、列/数值统计与安全上限
    status: completed
  - id: wire-report
    content: 在 build_fetch_tool_report 插入【数据摘要】；mcp_server 成功/失败可选 result_summary 字段
    status: completed
  - id: tests
    content: 添加单元测试覆盖有数据/空数据/子查询/追问
    status: completed
  - id: issue-log
    content: ISSUE_LOG.md 追加条目
    status: completed
isProject: false
---

# fetch_data_from_oem 结果摘要（实事求是）

## 现状

- `[src/mcp_server.py](e:\edwin\AIGC\askoem\src\mcp_server.py)`：`fetch_data_from_oem` 成功时返回 `data` + `report`（由 `service.build_fetch_tool_report` 生成）。
- `[AskOpsService.build_fetch_tool_report](e:\edwin\AIGC\askoem\src\service.py)`（约 327–378 行）：已含【问题】【SQL 执行追踪】【状态】【意图摘要】【数据】表格（`_build_data_reply` → `_build_sql_result_table_text` 等）。
- `[_build_fallback_summary](e:\edwin\AIGC\askoem\src\service.py)`（约 396–405 行）：仅行数统计，未嵌入 `report`。
- 扩展侧 `[formatToolResultForDisplay](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\orchestration\assistantOrchestrator.ts)`：有 `report` 则整段展示，**无需改扩展**即可显示新段落。

## 目标

在**不编造**业务结论（根因、是否异常、处置建议）的前提下，基于 `FetchDataResult` 内**已有结构化数据**生成一段**数据摘要**，满足「根据结果总结、不随意篡改数据和含义」。

## 设计原则

1. **仅用事实**：摘要中的数字、列名、取值范围、去重后的枚举值，必须来自 `latest_data` / `omr_sub_queries[].latest_data` /（若需要）`metric_time_series` / `incidents` 的**实际内容**。
2. **禁止**：推断告警等级是否「严重」、是否「需要扩容」、编造未出现的 `target_name` / 指标名。
3. **允许**：行数、列集合、每列非空行数、对「可解析为数字」的列做 min/max（字符串转 float 失败则跳过该列统计）、低基数列（如去重数 ≤ 10）列出 distinct 值列表（可设上限避免超长）。
4. **追问路径**：`need_follow_up == True` 时摘要仅说明「未完成取数，需追问」+ 复述 `follow_up_question`（或一句指向说明），**不**假装有数据。

## 实现位置（推荐）

- 在 `[src/service.py](e:\edwin\AIGC\askoem\src\service.py)` 新增 `**_build_fetch_data_fact_summary(fetched: FetchDataResult) -> str`**（或同等命名），由 `**build_fetch_tool_report`** 在【数据】或【说明】之后、**【元信息】**之前插入新小节 `**【数据摘要】`**。
- **子查询**：`omr_sub_queries` 存在时，按子查询分段生成摘要（每段注明 `sub_question` 或序号），每段只使用该段 `latest_data`。
- **长度**：对 distinct 列表、列名列举设合理上限（例如列数过多只列前 N 列 +「共 M 列」）。

## MCP 返回（可选增强）

- 成功字典中增加 `**result_summary`**（或 `data_fact_summary`）字段，内容与 `report` 内【数据摘要】**一致**，便于 CLI/自动化解析而无需从长文本截取。
- **失败**（`need_follow_up`）分支同样可带简短 `result_summary`，与 `result`（追问文案）区分：`**result`** 给人读；`**result_summary`** 说明状态（需追问、无数据表）。

## 测试

- 在 `[tests/](e:\edwin\AIGC\askoem\tests)` 增加针对 `**_build_fetch_data_fact_summary**` 或 `**build_fetch_tool_report**` 的单元测试：构造最小 `FetchDataResult`（多行、多列、一列全为数字字符串），断言摘要中含正确行数与 min/max；空数据断言「未查询到数据」类表述。

## 与 LLM 的关系

- **第一版不调用 LLM**：满足「实事求是」与实现成本；若日后需要自然语言润色，应单独增加开关，且 **输入仅限** 本摘要 + 表格片段，**system prompt** 写明禁止补充数据中不存在的实体（可作为后续迭代，**不纳入本计划必选范围**）。

## 文档

- 在 `[ISSUE_LOG.md](e:\edwin\AIGC\askoem\ISSUE_LOG.md)` 追加一条简要变更说明（范围、行为、重启 MCP）。

```mermaid
flowchart LR
  fetch_data[fetch_data in service]
  fdr[FetchDataResult]
  summary[_build_fetch_data_fact_summary]
  report[build_fetch_tool_report]
  mcp[MCP JSON report plus optional result_summary]
  fetch_data --> fdr
  fdr --> summary
  summary --> report
  report --> mcp
```



