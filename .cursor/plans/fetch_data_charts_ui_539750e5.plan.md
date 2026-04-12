---
name: Fetch data charts UI
overview: 在 VS Code 扩展内为 `fetch_data_from_oem` 工具结果增加可选图表展示：从已有 MCP JSON 解析数据、生成最多 10 个图表规格；通过配置项开关；Webview 内用本地 Chart.js 渲染，不改变 Python 后端。
todos:
  - id: types-payload
    content: "appTypes: ExecutionStep.fetchCharts + FetchDataChartsPayload"
    status: cancelled
  - id: build-payload
    content: 新增 buildFetchDataChartsPayload.ts（解析 MCP JSON，最多 10 图，类型启发）
    status: cancelled
  - id: orchestrator-wire
    content: "assistantOrchestrator: 两处 callTool 后对 fetch_data_from_oem 附加 fetchCharts"
    status: cancelled
  - id: settings
    content: "package.json + settingsService: showFetchDataCharts"
    status: cancelled
  - id: media-chartjs
    content: media/chart.umd.min.js + 构建复制或文档化
    status: cancelled
  - id: chatpanel-render
    content: "chatPanel: CSP/脚本 URI、runSteps 渲染 canvas + Chart 初始化；payload 带开关"
    status: cancelled
  - id: extension-post
    content: "extension: postAssistantResult 传开关；配置变更通知 webview"
    status: cancelled
isProject: false
---

# fetch_data_from_oem 结果图表展示（仅扩展前端）

## 约束与事实

- **不改** `[src/mcp_server.py](src/mcp_server.py)` / `[src/service.py](src/service.py)` 等 Python 代码。
- MCP 成功返回已包含结构化字段：`data.latest_data`、`data.metric_time_series`、`intent.metric_keys` 等（见 `[mcp_server.py` 约 69–93 行](src/mcp_server.py)）。
- 当前 `[assistantOrchestrator.ts](alert-mcp-vscode-extension/src/orchestration/assistantOrchestrator.ts)` 对工具结果只把 `**formatToolResultForDisplay` 得到的纯文本**写入 `ExecutionStep.detail`（约 192–199、331–336 行），**图表所需的 JSON 未进入 `AssistantResult.steps`**。
- `[chatPanel.ts](alert-mcp-vscode-extension/src/views/chatPanel.ts)` 中 `runSteps()` 用 `result.steps` 渲染 Trace（约 433–444 行），**可在同一 `step` 对象上增加可选字段**，不影响无该字段的旧消息。

## 架构

```mermaid
flowchart LR
  MCP[MCP_toolResult_JSON_string]
  Orch[AssistantOrchestrator]
  Build[buildFetchDataChartsPayload]
  AR[AssistantResult_steps]
  WV[Webview_render]
  MCP --> Orch
  Orch --> Build
  Build --> AR
  AR --> WV
```



- **Orchestrator**：在 `toolName === 'fetch_data_from_oem'` 且能解析出 `ok === true` 的 JSON 时，调用纯函数 `buildFetchDataChartsPayload(parsed)`；若得到非空图表列表，则给对应 `**tool-result` 步骤**增加可选字段（见下），`**detail` 仍为现有 report 文本**（行为与现网一致）。
- **两处调用点**必须一致处理：主 LLM 循环（约 192–199 行）与 `[tryRunPreferredToolChain](alert-mcp-vscode-extension/src/orchestration/assistantOrchestrator.ts)`（约 331–336 行），避免仅 `@` 链式调用时无图表。

## 类型与载荷

在 `[appTypes.ts](alert-mcp-vscode-extension/src/types/appTypes.ts)` 中：

- 扩展 `[ExecutionStep](alert-mcp-vscode-extension/src/types/appTypes.ts)`：增加可选 `fetchCharts?: FetchDataChartsPayload`（名称可微调，与实现一致即可）。
- 定义 `**FetchDataChartsPayload`**（建议扁平、便于序列化与 Webview 消费），例如：
  - `charts: Array<{ title: string; chartType: 'line' | 'bar' | 'scatter'; labels: string[]; datasets: Array<{ label: string; data: (number | null)[] }> }>`
  - **长度上限 10**（在构建函数内截断）。

历史会话中已保存的 `AssistantResult` 无 `fetchCharts` 时，渲染逻辑与现在相同。

## 构建逻辑（新模块）

新增例如 `[alert-mcp-vscode-extension/src/charts/buildFetchDataChartsPayload.ts](alert-mcp-vscode-extension/src/charts/buildFetchDataChartsPayload.ts)`（路径可调整）：

- **输入**：`Record<string, unknown>`（已 `JSON.parse` 的 MCP 返回），**非** `fetch_data_from_oem` 或 `ok !== true` 或无可画数据时返回 `undefined`。
- **多指标 / 多图**：
  - 优先使用 `data.metric_time_series`：按常见列名分组（如 `METRIC_NAME`、`COLUMN_LABEL`、`METRIC_COLUMN` 等，对 OEM/OMR 行字典做大小写不敏感探测）；每组一条时间序列 → **折线图**（X：时间列，Y：数值列）；**最多 10 个图**。
  - 若时间序列为空，再用 `data.latest_data`：按列推断类型（时间戳列 + 数值列 → 折线；分类列 + 数值列 → **柱状**；两数值列 → **散点**）；若存在多个数值指标列，可一列一图或按 `intent.metric_keys` 裁剪，仍受 **10** 限制。
- **边界**：行数过多时仅取前 N 行参与绘图（例如每图上限 200 点，具体常量写在模块内）；**不截断** `detail` 文本与持久化内容。
- **安全**：图表只用数值与时间/标签字段；不对密码类字段建轴（若某列名含 `password` 等可跳过该列）。

## 设置开关

- 在 `[package.json](alert-mcp-vscode-extension/package.json)` `configuration` 增加例如 `alertMcp.ui.showFetchDataCharts`（`boolean`，默认 `true` 或 `false` 二选一，在实现时固定一个默认值并写清）。
- 在 `[settingsService.ts](alert-mcp-vscode-extension/src/services/settingsService.ts)` 的 `ExtensionSettings.ui` 中读取该键并暴露给调用方。

可选增强（若时间允许）：Webview 顶栏增加「显示图表」复选框，用 `localStorage` 记录覆盖偏好；**MVP 可只做 VS Code 设置**，避免范围膨胀。

## Webview（`[chatPanel.ts](alert-mcp-vscode-extension/src/views/chatPanel.ts)`）

- **不修改**现有 `finalText` 与 `step.detail` 的展示方式。
- 在 `runSteps()` 中：当全局/消息携带的 `**showFetchDataCharts === true`** 且 `step.fetchCharts?.charts?.length`，在对应 `tool-result` 块内 **在文本下方** 插入图表容器（例如每个图一个 `<canvas>` + 稳定 `id` 或 `data-chart-index`）。
- **Chart.js**：将 UMD 构建放入 `[alert-mcp-vscode-extension/media/](alert-mcp-vscode-extension/media/)`（如 `chart.umd.min.js`），在 `[ChatPanel](alert-mcp-vscode-extension/src/views/chatPanel.ts)` 中用 `webview.asWebviewUri` 生成脚本 URL（需在构造函数中传入 `extensionUri`，当前 `_context` 已存在可复用），避免依赖外网 CDN 与过严 CSP 问题。
- 在步骤 HTML 插入后，用 **同一脚本内** 的函数遍历 `step.fetchCharts` 调用 `new Chart(...)`；对 `conversation-activate` / 历史回放路径（`skipTypewriter === true`）走同一渲染逻辑，保证重载会话仍可画图。
- **关闭开关时**：不插入 canvas、不加载 Chart 实例；**不影响**纯文本 Trace。

## 扩展入口（`[extension.ts](alert-mcp-vscode-extension/src/extension.ts)`）

- `postAssistantResult`（或等价路径）在发往 Webview 的 payload 中附带 `showFetchDataCharts: settingsService.get().ui.showFetchDataCharts`（字段名与 `ChatPanel` 约定一致）。
- 订阅 `onDidChangeConfiguration`（若已有则扩展）：当 `alertMcp.ui.showFetchDataCharts` 变化且面板打开时，向 Webview `postMessage` 更新开关，避免必须重开面板。

## 构建与依赖

- `package.json` 增加 `chart.js` 为 **devDependency**，在 `npm run build` 或新增 **copy 脚本** 将 `node_modules/chart.js/dist/chart.umd.min.js` 复制到 `media/`（或文档化「发布前执行一次复制」）。若希望零复制，可改为在 `esbuild.mjs` 中增加 copy 步骤。

## 非目标（本次不做）

- 不修改 MCP Python；不为 `execute_omr_sql` 画图（除非与 `fetch_data_from_oem` 完全同构且你希望扩展——默认不做）。
- 不在 Orchestrator 中把完整原始 JSON 写入 `detail`（避免刷屏与泄露）；仅附加精简后的 `fetchCharts`。

## 验证建议

- 连接 MCP，调用 `@fetch_data_from_oem` 返回含 `metric_time_series` 或表格类 `latest_data` 的问题；开关开/关对比；会话持久化后重开面板检查历史图是否仍出现。

