# Issue / Change Log

本文件记录 askoem 仓库内与 MCP、后端服务、VS Code 扩展相关的**已落地变更结论**。后续每次合入或发布前在此**追加**一条条目（按日期倒序或正序均可，建议新条目写在文件顶部）。

**条目格式（建议复制后填写）：**

```
## YYYY-MM-DD — 简短标题

- **范围**：涉及文件或模块（例：`src/mcp_server.py`）
- **问题 / 目标**：一句话
- **结论**：做了什么、行为变化
- **备注**：破坏性变更、配置项、需重启 MCP/扩展等
```

---

## 2026-04-11 — VS Code 扩展：fetch_data 图表 — 散点改表格、小样本折线改表格、类型标签、多列表格

- **范围**：[`alert-mcp-vscode-extension/src/charts/buildFetchDataChartsPayload.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\charts\buildFetchDataChartsPayload.ts)、[`alert-mcp-vscode-extension/src/types/appTypes.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\types\appTypes.ts)、[`alert-mcp-vscode-extension/src/views/chatPanelHtml.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\views\chatPanelHtml.ts)

- **问题 / 目标**：散点/气泡可读性差；折线在点数极少时折线意义不大；表格需支持多系列列；前端需标明当前块是何种图表类型。

- **结论**：
  1. **`latest_data` 两列数值**：不再下发 `chartType: 'scatter'`，一律 **`table`**（两列数值格式化写入 `tableColumns` / `tableRows`）。
  2. **遗留 `scatter` + `scatterPoints`**：在 **`applyChartTypePreference`** 开头归一：用户未指定折线/柱状时改为 **`table`**；避免 `pref === scatter` 与 `chartType === scatter` 时早退导致不落表。
  3. **用户问题含「散点图 / scatter」**（`parseChartPreferencesFromQuestion` → `chartType: scatter`）：原先把折线/柱状转成散点；现改为转成 **两列表格**（横轴标签 + 数值列），不再画气泡。
  4. **折线图点数 ≤3**：在 **`finalizeCharts`** 中，于 **`mergeLineChartSpecs` 之后**、**`applyChartTypePreference` 之前**，对 **`chartType === 'line'`** 且 **`labels.length` 为 1～3** 的 spec 调用 **`lineOrBarChartToTable`**，与多系列折线一致（首列类别/时间，其余列为各 `dataset`）。
  5. **`FetchDataChartSpec`**：**`tableColumns`** / **`tableRows`** 类型为 **`string[]`** / **`string[][]`**，支持多列表格；Webview 表格分支条件为 **`tableColumns.length >= 2`**。
  6. **Webview**：每个图表块在标题上方增加 **`图表类型：…`**（折线图 / 柱状图 / 散点图（气泡）/ 表格），样式类 **`oem-chart-type-row`**、**`oem-chart-type-label`**。

- **备注**：**柱状图**不按条数强制改表格；仅折线受「≤3 点」规则影响。修改扩展后**重新加载窗口/扩展**。

---

## 2026-04-11 — 【汇总】扩展 RAG Console、Tavily 检索、fetch_data Trace 与 MCP 取数摘要（本轮）

- **范围（VS Code 扩展）**：[`alert-mcp-vscode-extension/`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension) 内 `extension.ts`、`views/chatPanel.ts`、`chatPanelHtml.ts`、`chatPanelTypes.ts`、`ragChatPanel.ts`、`services/conversationStore.ts`、`oracleDocSearchService.ts`、`secretStorageService.ts`、`orchestration/ragOrchestrator.ts`、`orchestration/assistantOrchestrator.ts`、`views/opsSidebarProvider.ts`、`views/settingsPanel.ts`、`services/settingsService.ts`、`types/appTypes.ts`、`package.json`；脚本 [`scripts/gen_chat_panel_html.py`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\scripts\gen_chat_panel_html.py)（可选，用于从 `chatPanel` 再生成 HTML 模板）。

- **范围（后端 / MCP，与取数摘要同轮）**：[`src/service.py`](e:\edwin\AIGC\askoem\src\service.py)、[`src/mcp_server.py`](e:\edwin\AIGC\askoem\src\mcp_server.py)；测试 [`tests/test_fetch_fact_summary.py`](e:\edwin\AIGC\askoem\tests\test_fetch_fact_summary.py) 等（细目见本文件同日期各条）。

- **目标**：在 OEM 控制台外提供独立 **RAG Console**；检索仅 **Oracle 英文文档树**与 **Oracle Blogs**；**不削弱** `fetch_data_from_oem` 在 **Tool Execution Trace** 中的完整 `report`（含 SQL 追踪）；取数侧保留客观 **`result_summary`** 与可选 **`llm_summary`**。

- **结论（按能力）**：

  | 能力 | 要点 |
  |------|------|
  | **独立 RAG 面板** | `RagChatPanel`（`alertMcpRagConsole`），`ConversationStore(..., oemAssistant.ragConversations.v1)`，命令 `alertMcp.openRagConsole`；**Operations** 树与视图标题栏均可打开。 |
  | **共享 Webview HTML** | `buildChatPanelHtml({ mode: 'oem' \| 'rag' })`；RAG 隐藏 MCP 工具/图表/`@`；消息 **`rag-ask`**；助手 **`referenceLinks`** → 气泡下「相关文档」。 |
  | **Tavily 检索** | `searchOracleRagViaTavily` → [Tavily Search API](https://api.tavily.com/search)；`include_domains: docs.oracle.com, blogs.oracle.com`；**`isAllowedOracleRagUrl`** 二次过滤（docs 仅 **`/en/`** 路径树，blogs 全站）。密钥 **`SecretStorage`**（`getTavilyApiKey` / `setTavilyApiKey`）；**Settings** 面板「**RAG（Oracle 文档 / 博客）**」密码框配置。已**移除** `alertMcp.rag.googleApiKey`、`alertMcp.rag.googleCx`。 |
  | **Trace 与主回答分离** | 工具结果步骤 **`detail`** → **`formatToolResultForExecutionTrace`**（优先完整 **`report`**）；气泡/链式最终正文仍用 **`formatToolResultForDisplay`**（优先 **`llm_summary`**）。 |
  | **MCP 取数** | `result_summary`、报告内【数据摘要】；成功返回 **`llm_summary`** 时 **`result`** 优先 LLM 文案；扩展工具展示层对 `llm_summary` 的优先级逻辑见 `assistantOrchestrator`（与 Trace 全量 `report` 不冲突）。 |

- **备注**：扩展修改后 **重新加载窗口/扩展**；Python/MCP 修改后 **重启 MCP**；Tavily Key 仅在 **OEM Assistant Settings** 中保存，不写进 `settings.json` 明文项。

---

## 2026-04-11 — VS Code 扩展：独立「RAG Console」与 docs.oracle.com 检索

- **范围**：[`alert-mcp-vscode-extension/src/extension.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\extension.ts)、[`alert-mcp-vscode-extension/src/views/ragChatPanel.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\views\ragChatPanel.ts)、[`alert-mcp-vscode-extension/src/views/chatPanelHtml.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\views\chatPanelHtml.ts)、[`alert-mcp-vscode-extension/src/services/conversationStore.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\services\conversationStore.ts)、[`alert-mcp-vscode-extension/src/services/oracleDocSearchService.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\services\oracleDocSearchService.ts)、[`alert-mcp-vscode-extension/src/orchestration/ragOrchestrator.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\orchestration\ragOrchestrator.ts)、[`alert-mcp-vscode-extension/package.json`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\package.json)

- **问题 / 目标**：在 OEM 控制台之外增加独立 Webview「RAG Console」；会话列表/持久化与 OEM 隔离；问答不依赖 MCP；助手气泡底部展示真实文档链接；未来可替换检索后端为向量 RAG。

- **结论**：
  1. **`ConversationStore`** 支持第二个参数 **`storageKey`**；RAG 使用 **`oemAssistant.ragConversations.v1`**。
  2. **命令** `alertMcp.openRagConsole`（侧栏与命令面板）；**`RagChatPanel`**（webview id `alertMcpRagConsole`）与 **`ChatPanel`** 可并存。
  3. **UI**：`buildChatPanelHtml({ mode: 'oem' | 'rag' })` 共享布局；RAG 模式隐藏 MCP 工具、图表与 `@` 提及；发送 **`rag-ask`**。
  4. **检索后端**：后续条目已改为 **Tavily**（见下方「RAG：Google CSE 改为 Tavily」）；本条不再描述 Google CSE。
  5. **`RagOrchestrator`**：读取 **`SecretStorage` LLM Key** 与 **Tavily Key**；抓取前 N 页 HTML 或 Tavily `content`；LLM 输出 JSON `{ answer, references }`，**`AssistantResult.referenceLinks`** 在 **「相关文档」**区渲染。
  6. **settings**：`alertMcp.rag.searchTopK`、`snippetMaxChars`、`fetchSnippetPages`；Tavily Key 在 **Settings 面板「RAG」**。

- **备注**：修改后**重新加载扩展**。

---

## 2026-04-11 — RAG：Google CSE 改为 Tavily；Settings 增加 Tavily API Key

- **范围**：[`alert-mcp-vscode-extension/src/services/oracleDocSearchService.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\services\oracleDocSearchService.ts)、[`alert-mcp-vscode-extension/src/orchestration/ragOrchestrator.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\orchestration\ragOrchestrator.ts)、[`alert-mcp-vscode-extension/src/services/secretStorageService.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\services\secretStorageService.ts)、[`alert-mcp-vscode-extension/src/views/settingsPanel.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\views\settingsPanel.ts)、[`alert-mcp-vscode-extension/package.json`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\package.json)

- **问题 / 目标**：用 [Tavily Search](https://api.tavily.com/search) 替代 Google CSE；密钥在 **Settings 面板「RAG」** 中配置并写入 **SecretStorage**；检索范围仅 **https://docs.oracle.com/en/** 与 **https://blogs.oracle.com/**（`include_domains` + URL 白名单）。

- **结论**：删除 **`alertMcp.rag.googleApiKey` / `googleCx`** 配置项；**`searchOracleRagViaTavily`** 使用 `include_domains: ['docs.oracle.com','blogs.oracle.com']`，**`isAllowedOracleRagUrl`** 要求 docs 路径以 **`/en/`** 开头（或 `/en`）；**`getTavilyApiKey` / `setTavilyApiKey`**。

---

## 2026-04-11 — 扩展：fetch_data Tool Execution Trace 恢复完整 report；侧栏增加 Open Console RAG

- **范围**：[`alert-mcp-vscode-extension/src/orchestration/assistantOrchestrator.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\orchestration\assistantOrchestrator.ts)、[`alert-mcp-vscode-extension/src/views/opsSidebarProvider.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\views\opsSidebarProvider.ts)

- **问题 / 目标**：`fetch_data_from_oem` 的 JSON 含 `llm_summary` 时，Trace 曾只显示摘要导致 SQL 说明丢失；RAG 入口仅在视图标题栏，Operations 树中无项。

- **结论**：新增 **`formatToolResultForExecutionTrace`**，工具结果步骤的 `detail` 一律用完整 **`report`**（含【SQL 执行追踪】）；主回答仍用 **`formatToolResultForDisplay`**（优先 `llm_summary`）。侧栏 **`Open Console RAG`** 树节点绑定 **`alertMcp.openRagConsole`**。

---

## 2026-04-11 — `fetch_data_from_oem`：LLM 总结（`llm_summary`）与面板仅展示 LLM 正文

- **范围**：[`src/service.py`](e:\edwin\AIGC\askoem\src\service.py)、[`src/mcp_server.py`](e:\edwin\AIGC\askoem\src\mcp_server.py)、[`alert-mcp-vscode-extension/src/orchestration/assistantOrchestrator.ts`](e:\edwin\AIGC\askoem\alert-mcp-vscode-extension\src\orchestration\assistantOrchestrator.ts)、[`tests/test_fetch_fact_summary.py`](e:\edwin\AIGC\askoem\tests\test_fetch_fact_summary.py)

- **问题 / 目标**：在客观摘要与数据片段基础上，用 LLM 生成**仅依据实际结果**的中文总结；扩展侧工具结果展示以 **LLM 正文为主**（有 `llm_summary` 时只显示该字段）。

- **结论**：
  1. **`AskOpsService.build_fetch_llm_summary`**：输入为用户问题、`build_fetch_data_fact_summary` 结果、`_compact_fetch_payload_for_llm`（JSON 片段，有截断）；使用 **LangChain + ChatOpenAI（DEEPSEEK_*** 环境变量）**，temperature=0；`need_follow_up` 或未配置 API Key 或调用异常时返回空串。
  2. **MCP `fetch_data_from_oem` 成功**：返回 **`llm_summary`**；**`result`** = `llm_summary` 非空时为 LLM 文本，否则为 **`result_summary`**（客观摘要）。追问分支 **`llm_summary`** 为 `""`**，**`result`** 仍为追问文案。
  3. **`execute_omr_sql` 成功**：同样返回 **`llm_summary`** / **`result`**（与上同逻辑）。
  4. **扩展 `formatToolResultForDisplay`**：若 JSON 含非空 **`llm_summary`**，**只**返回该字符串；否则仍用 **`report`**。

- **备注**：需配置 **`DEEPSEEK_API_KEY`** 才会生成非空 **`llm_summary`**；修改后重启 **MCP** 与**重新加载扩展**。

---

## 2026-04-11 — `fetch_data_from_oem`：客观数据摘要（`result_summary` + 报告内【数据摘要】）

- **范围**：[`src/service.py`](e:\edwin\AIGC\askoem\src\service.py)、[`src/mcp_server.py`](e:\edwin\AIGC\askoem\src\mcp_server.py)、[`tests/test_fetch_fact_summary.py`](e:\edwin\AIGC\askoem\tests\test_fetch_fact_summary.py)、[`tests/test_service_omr_mode.py`](e:\edwin\AIGC\askoem\tests\test_service_omr_mode.py)

- **问题 / 目标**：在取数成功后，基于返回结果给出**不编造**的总结（行数、列、数值 min/max、低基数去重等）；不调用 LLM。

- **结论**：
  1. 新增 **`AskOpsService.build_fetch_data_fact_summary`**（及 `_fact_summary_lines_for_rows`、`_fact_summary_auxiliary_lists`、`_fact_summary_incidents_events_only`）、模块级 **`_try_parse_float_cell`**。
  2. **`build_fetch_tool_report`** 在【元信息】前增加 **【数据摘要】** 小节，内容与下述 `result_summary` 一致。
  3. **MCP `fetch_data_from_oem`**：成功与「需追问」分支均返回 **`result_summary`** 字段。
  4. **`execute_omr_sql`** 成功返回增加 **`result_summary`**（与 `report` 内摘要一致）。
  5. **测试**：`test_fetch_fact_summary.py`；`test_service_omr_mode` 中 `run_skill` 断言改为包含 **`host01`**（与当前 builtin 表格输出一致）。

- **备注**：修改后需**重启 MCP** 进程。摘要仍**不**包含根因诊断或处置建议；若需自然语言润色须另开开关与严格 prompt。

---

## 2026-04-11 — NL2SQL（`nl2sql_engine.py`）：表空间阈值/利用率、ORA-01722 与模板收紧

- **范围**：`src/nl2sql_engine.py`、`tests/test_nl2sql_engine.py`

- **问题 / 目标**：英文「database/RAC 表空间阈值 between 15 and 25」、中文「表空间利用率区间/大于 N percent/指定库名」等问法在 `fetch_data_from_oem` 执行时出现 **ORA-01722**；或模板过严导致无行；需模板 + few-shot + 安全检查与行为一致。

- **结论（按修改项）：**
  1. **根因说明**：`MGMT$METRIC_CURRENT.VALUE` 与 `MGMT$TARGET_METRIC_SETTINGS` 的 `WARNING_THRESHOLD` / `CRITICAL_THRESHOLD` 在 OMR 中多为 **VARCHAR**；对 `VALUE` 直接 `BETWEEN` / `>` 与数字字面量比较若触发隐式转换失败或非数字串会 **ORA-01722**；阈值配置与「当前采集利用率」应区分视图（阈值用 `MGMT$TARGET_METRIC_SETTINGS`，当前值用 `MGMT$METRIC_CURRENT`）。
  2. **白名单与 schema**：`ALLOWED_VIEWS` 增加 `mgmt$target_metric_settings` / `sysman.mgmt$target_metric_settings`；`VIEW_SCHEMA_DESCRIPTION` 增加 **§8** `MGMT$TARGET_METRIC_SETTINGS` 列说明与 VARCHAR 阈值比较规则；**COLUMN_LABEL** 块顺延编号。
  3. **英文阈值模板**：问题含 `tablespace`、`threshold`、`between X and Y` 且目标为 database/RAC 时，生成对 `sysman.mgmt$target_metric_settings` 的 SQL，`TO_NUMBER(TRIM(warning_threshold/critical_threshold))` + `REGEXP_LIKE` 数字串过滤。
  4. **表空间利用率模板（区间）**：中文「高于/小于」、英文双界、`在…之间`、`between`（非 threshold 英文专指时）等；`SYSMAN.MGMT$METRIC_CURRENT` + 表空间相关 `metric_name`/`column_label`；**「列出…数据库」** 与「表空间+利用率」冲突时不再误返回 `MGMT$TARGET` 清单。
  5. **单边阈值 + 库名 + percent**：解析「大于 N percent / % / 百分之 N」将阈值设为 **N/100**；无 percent 用语时用 **N**（0–100 口径）；`X数据库` 正则提取库名并 `LOWER(target_name)=LOWER('X')`；区间上 **between … percent**、中文 `%` 区间时对上下界除以 100。
  6. **条件简化（用户反馈）**：去掉 `REGEXP_LIKE` 预过滤与冗长 `TO_NUMBER(REGEXP_REPLACE(...))` 链，改为 **`VALUE` 与数字字面量直接比较**（`value >= 0.15`、`value > 15 AND value < 30`、`value BETWEEN …`），`ORDER BY value DESC NULLS LAST`，依赖 Oracle 对 VARCHAR 的隐式数字比较以**避免过严过滤无数据**。
  7. **`_has_unsafe_varchar_numeric_compare`**：仅对 **`warning_threshold` / `critical_threshold`** 要求 `TO_NUMBER(TRIM(...))`；**不再**将 `VALUE` 与数字字面量比较判为不安全（否则表空间模板无法通过 `_is_safe_sql`）。拒绝原因文案同步去掉对 `VALUE` 的强制描述。
  8. **Few-shot 与系统规则**：补充英文阈值示例、中文区间与「omrdb + 15 percent」示例；规则 **12**（VALUE 比较策略）、**16**（表空间当前利用率、`percent` 与阈值口径）与 VIEW 中表空间段落与上述行为一致。
  9. **测试**：`test_nl2sql_engine` 增加/调整表空间模板与安全检查用例；模板断言随 `value` 简化与阈值列分离而更新。

- **备注**：若某库 `VALUE` 含 `%` 或非数字仍可能 **ORA-01722**，VIEW 中已说明可再改为 `TO_NUMBER(TRIM(REPLACE(VALUE,'%','')))`。修改 NL2SQL 后需**重启**加载该模块的 MCP/服务进程。

---

## 2026-04-11 — VS Code 扩展：fetch_data_from_oem 结果 Chart.js 图表

- **范围**：`alert-mcp-vscode-extension/src/charts/buildFetchDataChartsPayload.ts`、`alert-mcp-vscode-extension/src/orchestration/assistantOrchestrator.ts`、`alert-mcp-vscode-extension/src/views/chatPanel.ts`、`alert-mcp-vscode-extension/src/extension.ts`、`alert-mcp-vscode-extension/src/types/appTypes.ts`、`alert-mcp-vscode-extension/src/services/settingsService.ts`、`alert-mcp-vscode-extension/package.json`、`alert-mcp-vscode-extension/scripts/copy-chart.mjs`、`alert-mcp-vscode-extension/media/chart.umd.min.js`

- **问题 / 目标**：在仅改扩展的前提下，对 `fetch_data_from_oem` 工具返回的 JSON 中 `data.metric_time_series` / `data.latest_data` 做图表化，最多 10 个图；配置项 `alertMcp.ui.showFetchDataCharts` 控制是否渲染；不改变现有文本与 Trace 文本内容。

- **结论**：
  1. **`buildFetchDataChartsPayload`**：解析 MCP 原始 JSON（未改 Python），按时间序列分组折线、分类柱状、双数值散点；`fetchCharts` 挂在 `ExecutionStep` 上。
  2. **`AssistantOrchestrator`**：主循环与 `@` 工具链两处 `tool-result` 在 `fetch_data_from_oem` 成功时附加 `fetchCharts`。
  3. **Webview**：`localResourceRoots` + CSP；加载 `media/chart.umd.min.js`；图表渲染在助手 **`answer-body` 下方**「数据图表」区块（非 Trace 内）；Trace 为 `<details>` 纯文本；`chart-settings` / `assistant-result.showFetchDataCharts` 与主界面「显示数据图表」控制是否画图。
  4. **`npm run build`** 后执行 `copy-chart.mjs`：优先从 `node_modules/chart.js` 复制，否则从 jsDelivr 拉取 UMD。

- **备注**：Python MCP 未改动。关闭图表仅隐藏 canvas，报告文本不变。

- **原「后续」计划项核对（2026-04-11）**：以下已在 `alert-mcp-vscode-extension/src/views/chatPanel.ts` 与 `buildFetchDataChartsPayload.ts` 落地，本条不再作为待办：
  1. 图表区在助手气泡内 **`answer-body` 之后**、独立区块 **「数据图表」**（`.oem-chart-section` / `.oem-chart-section-title`）。
  2. **Tool Execution Trace** 为 `<details>` 内纯文本步骤，**不含**图表 DOM。
  3. 主界面 **「显示数据图表」** 复选框，`localStorage` 键 **`oemAssistant.showCharts`**。
  4. **`FetchDataChartSpec`** 已含 **`xAxisLabel` / `yAxisLabel`**；柱状/折线等路径在 **`buildFetchDataChartsPayload`** 中通过 **`friendlyAxisName(catKey|timeKey|valKey)`** 填充轴标题。

- **下一项开发建议**（未在本轮实现）：**`assistantOrchestrator.ts`** 仍含 **`ask_ops`** 文案；当前 **`shouldForceAskOps`** 在 MCP **未注册 `ask_ops`** 时返回 **false**，不会误拦。若产品要求「告警诊断必先调用 **`run_skill`** 或其它工具」，需改 system prompt / 强制逻辑与工具名，并记入本日志。

---

## 2026-04-11 — VS Code 扩展：多会话控制台与 globalState 持久化

- **范围**：`alert-mcp-vscode-extension/src/extension.ts`、`alert-mcp-vscode-extension/src/views/chatPanel.ts`、`alert-mcp-vscode-extension/src/services/conversationStore.ts`、`alert-mcp-vscode-extension/src/types/appTypes.ts`

- **问题 / 目标**：同一 Webview 内支持多个会话（新建 / 选中 / 重命名 / 删除）、会话列表与当前线程展示；用户消息与完整 `AssistantResult`（含 `steps`）写入 `ExtensionContext.globalState`，不做内容截断；`oemSessionId` 按会话隔离；断开 MCP 只清空 OEM 会话映射，不删除已存会话。

- **结论**：
  1. 新增 **`ConversationStore`**：键 `oemAssistant.conversations.v1`，保存 `ConversationSnapshot[]` 与 `activeId`；`appendUserMessage` / `appendAssistantMessage` / `appendInfoMessage`；失败时 `save` 抛错向用户提示。
  2. **`ChatPanel`**：左侧会话列表 + 右侧聊天区；`webview-ready` 后下发 `conversations-bootstrap`；`postConversationActivate`、`postConversationListUpdate`、`postAssistantResult` 带 `conversationId`，非当前会话的流式结果不渲染（已写入存储，切换会话后可见）。
  3. **`extension.ts`**：按会话维护 `sessionContextMap` 与 `oemSessionIdByConvId`；`disconnectMcp` 仅 `oemSessionIdByConvId.clear()`；`openPanel` 消息监听改为由单一 `Disposable` 在卸载时释放，避免重复 `subscriptions.push`。

- **备注**：Python MCP（`src/`）未改动。扩展需重新加载。

---

## 2026-04-11 — MCP、服务层与扩展：取数报告、OMR 直跑 SQL、UI 展示与文案

- **范围**：`src/mcp_server.py`、`src/service.py`、`src/nl2sql_engine.py`、`alert-mcp-vscode-extension/src/extension.ts`、`alert-mcp-vscode-extension/src/views/chatPanel.ts`、`alert-mcp-vscode-extension/src/orchestration/assistantOrchestrator.ts`

- **问题 / 目标**：
  - `fetch_data_from_oem` / `run_skill` 的返回需要可读的**纯文本报告**（含 SQL 追踪），便于 CLI/面板排查。
  - OMR 模式下需要**用户指定 SQL** 的执行入口，并与扩展侧参数命名（`query`）对齐。
  - NL2SQL 对 `MGMT$INCIDENTS` 的列描述与示例需与真实视图一致，避免生成非法 SQL。
  - 扩展输入框示例仍引用已废弃的 `ask_ops`；工具结果若为 JSON 应优先展示 `report` 字段。

- **结论**：
  1. **`fetch_data_from_oem`**：成功与需追问分支均增加 `generated_sql`、`sql_source`，并增加 `report`（由 `AskOpsService.build_fetch_tool_report` 生成）。
  2. **新增 MCP 工具 `execute_omr_sql`**：调用 `AskOpsService.execute_omr_sql`；参数 **`sql` 与 `query` 二选一**（优先 `sql`），兼容只传 `query` 的客户端；`health_check` 的 `tools` 列表包含该工具名。
  3. **`AskOpsService`**：`run_skill` 各出口统一经 `_finalize_run_skill_result` 附加 `report`（`build_run_skill_tool_report`）；新增 `build_fetch_tool_report` 及取数相关辅助方法；新增 **`execute_omr_sql`**（OMR 只读、与 NL2SQL 相同安全策略、行数上限等，与既有设计一致）；`omr_db` 下部分通用查询在满足条件时直接走 `builtin_query_reply` 表格化结果。
  4. **`OemNl2SqlEngine`**：更正 `MGMT$INCIDENTS` 列说明（无 `TARGET_NAME`/`TARGET_TYPE`，需 `JOIN MGMT$TARGET`）；更新 few-shot 与系统规则中的告警示例。
  5. **VS Code 扩展**：输入框与 `showInputBox` 的占位示例由 `@ask_ops` 改为 **`@fetch_data_from_oem`**。
  6. **`AssistantOrchestrator`**：新增 `formatToolResultForDisplay`：若工具返回为 JSON 且含非空 **`report`**，面板与链式最终结果优先展示该字符串，避免整段 JSON 难以阅读。

- **备注**：修改 MCP 后需**重启 MCP 服务**；修改扩展后需**重新加载/安装扩展**。`assistantOrchestrator.ts` 内仍存在针对旧工具名 `ask_ops` 的分支逻辑，与本次占位文案更新独立；若后续完全移除 `ask_ops`，需再改该文件并记入本日志。

---
