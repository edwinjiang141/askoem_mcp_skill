# OEM Assistant for VS Code

面向 **OEM 运维 / 取数 / 告警排查** 的专用扩展：连接 MCP 后端、OpenAI 兼容 LLM、可选 **Oracle 文档 RAG**；主控制台支持 `@tool` 编排、`fetch_data_from_oem` 结果 **Chart.js 图表或表格**、多会话持久化与 Tool Execution Trace。

---

## 1. 功能概览

| 能力 | 说明 |
|------|------|
| **OEM 控制台** | 命令 `OEM Assistant: Open Console`；侧栏 **Operations** 打开；`@` 选择 MCP 工具、多工具按输入顺序执行；打字机输出与脱敏。 |
| **RAG 控制台** | 命令 `OEM Assistant: Open Console RAG`；**不经过 MCP**；检索范围 **docs.oracle.com/en/** 与 **blogs.oracle.com**（Tavily）；回答底部 **相关文档** 链接。 |
| **MCP** | `auto` / `legacy-sse` / `streamable-http`；侧栏展示连接状态、工具列表。 |
| **LLM** | `openai-compatible`（默认 DeepSeek 类）或 `copilot`；Base URL / Model / Temperature 可配。 |
| **会话** | 多会话列表、新建/切换/重命名/删除；`globalState` 持久化完整 `AssistantResult`（含 `steps`）。 |
| **设置** | Webview Settings：MCP、LLM、OEM、UI、RAG；密钥走 **SecretStorage**（不写明文进 `settings.json`）。 |
| **取数可视化** | `fetch_data_from_oem` 成功且开启 `alertMcp.ui.showFetchDataCharts` 时，在助手正文下方渲染 **数据图表** 区块（最多 10 块）；详见下文 **§3**。 |
| **Trace** | 工具步骤 `detail` 优先展示完整 **`report`**（含 SQL 追踪）；气泡正文仍优先 **`llm_summary`**（若存在）。 |

---

## 2. 命令与入口

- **OEM Assistant: Open Console** — 主 OEM 聊天 Webview。
- **OEM Assistant: Open Console RAG** — RAG 专用 Webview（`alertMcpRagConsole`）。
- **OEM Assistant: Connect MCP Server** / **Disconnect MCP Server**
- **OEM Assistant: Set LLM API Key** / **Set MCP Bearer Token**
- **OEM Assistant: Open Settings** — 插件设置页（Webview）。
- 侧栏 **Operations** 视图：连接、打开控制台、打开 RAG、打开设置、刷新。

---

## 3. `fetch_data_from_oem` 图表与表格（当前策略）

图表由扩展侧 **`buildFetchDataChartsPayload`** 解析 MCP 返回 JSON（`data.metric_time_series`、`data.latest_data` 等）生成 **`FetchDataChartSpec`**，Webview 用 **Chart.js**（`media/chart.umd.min.js`）或 HTML **表格** 渲染。

**开关**：`alertMcp.ui.showFetchDataCharts`（默认 `true`）；主界面可勾选 **显示数据图表**（`localStorage`：`oemAssistant.showCharts`）。

**类型标签**：每个块标题上方展示 **「图表类型：折线图 / 柱状图 / 散点图（气泡）/ 表格」**。

**表格**

- **`latest_data` 两列均为数值**：只生成 **表格**（两列数值），不画散点/气泡。
- **遗留 `scatter` + `scatterPoints`**：在应用用户图表偏好前归一为 **表格**（用户显式要折线/柱状时除外）。
- **用户问题含「散点图 / scatter」**：原先把折线/柱状转成散点；现改为 **两列表格**（类别/序号 + 数值）。
- **多系列**：`tableColumns` / `tableRows` 支持 **多列**（首列横轴，其余列为各序列）。

**折线图**

- **横轴点数 1～3**：在 `finalizeCharts` 中把该折线图 **整表化**（与多系列规则一致）；**4 点及以上**保持折线。
- **柱状图**不按条数强制改表格。

**用户问题中的图表偏好**（`parseChartPreferencesFromQuestion`）：识别「折线图/柱状图/散点图」「分图/合并」「N 个图」等，传入 `applyChartTypePreference` 做轻量调整；与上表规则叠加时以 **payload 归一逻辑**为准。

---

## 4. 配置项（`contributes.configuration`）

| 键 | 含义 |
|----|------|
| `alertMcp.mcp.serverUrl` | MCP 服务 URL（旧版常用 `/sse` 端点）。 |
| `alertMcp.mcp.connectionMode` | `auto` \| `legacy-sse` \| `streamable-http`。 |
| `alertMcp.mcp.requestTimeoutMs` | 单次 MCP 调用超时（毫秒）。 |
| `alertMcp.llm.provider` | `openai-compatible` \| `copilot`。 |
| `alertMcp.llm.baseUrl` / `model` / `temperature` | OpenAI 兼容 Chat API。 |
| `alertMcp.ui.maxToolRounds` | 单次用户请求内模型—工具最大轮数。 |
| `alertMcp.ui.showFetchDataCharts` | 是否渲染取数图表区块。 |
| `alertMcp.oem.baseUrl` / `username` | OEM 企业账号（密码在 SecretStorage）。 |
| `alertMcp.rag.searchTopK` | Tavily 单次最大结果数。 |
| `alertMcp.rag.snippetMaxChars` | 抓取网页拼进 LLM 的总字符预算。 |
| `alertMcp.rag.fetchSnippetPages` | 对前 N 条结果拉取 HTML 片段（0 表示仅链接）。 |

**密钥（SecretStorage，不在 `settings.json` 明文）**：LLM API Key、MCP Bearer Token、OEM Password、**Tavily API Key**（RAG 在 Settings 面板「RAG」中配置）。

---

## 5. 推荐本地 `settings.json` 片段

```json
{
  "alertMcp.mcp.serverUrl": "http://127.0.0.1:3000/sse",
  "alertMcp.mcp.connectionMode": "auto",
  "alertMcp.llm.provider": "openai-compatible",
  "alertMcp.llm.baseUrl": "https://api.deepseek.com",
  "alertMcp.llm.model": "deepseek-chat",
  "alertMcp.llm.temperature": 0.1,
  "alertMcp.ui.showFetchDataCharts": true
}
```

---

## 6. 开发与打包

```bash
npm install
npm run lint
npm run build
```

- **`npm run build`**：esbuild 打包 + 将 **Chart.js UMD** 复制到 `media/chart.umd.min.js`（`scripts/copy-chart.mjs`）。
- 在 VS Code 中 **F5** 启动 Extension Development Host 调试。
- 发布包：`npm run package`（先 build 再 `vsce package`）。

---

## 7. 源码目录（与仓库一致）

```text
src/
  extension.ts                 # 激活、命令、ChatPanel / RagChatPanel / Settings
  commands/commandHelpers.ts
  services/
    settingsService.ts
    secretStorageService.ts
    conversationStore.ts
    oracleDocSearchService.ts  # Tavily + Oracle 域过滤
    mcp/mcpClientService.ts
    llm/openAiCompatibleLlmService.ts
  orchestration/
    assistantOrchestrator.ts    # OEM 主循环、工具结果格式化、fetchCharts 附加
    ragOrchestrator.ts         # RAG 问答
  charts/
    buildFetchDataChartsPayload.ts
    parseChartPreferencesFromQuestion.ts
  views/
    chatPanel.ts / chatPanelHtml.ts / chatPanelTypes.ts
    ragChatPanel.ts
    settingsPanel.ts
    opsSidebarProvider.ts
  types/appTypes.ts
```

---

## 8. 编排数据流（OEM 控制台）

```text
用户输入 → AssistantOrchestrator（tools + LLM）
       → 若 tool_calls → MCP callTool → 结果写回 steps
       → fetch_data_from_oem 成功时附加 fetchCharts（可选）
       → 最终文本 + Webview 展示 Trace + 数据图表区块
```

RAG 控制台不注册 MCP 工具列表；仅 Tavily 检索 + LLM + `referenceLinks`。

---

## 9. 边界与注意

- **业务规则、SQL、NL2SQL** 在 **MCP / Python 服务**（仓库 `src/`）；扩展负责连接、展示、图表 payload、密钥与会话。
- 修改扩展后 **重新加载窗口**；修改 MCP 后 **重启 MCP 进程**。
- `@modelcontextprotocol/client` 与 MCP transport 随上游演进，升级依赖时对照官方文档。

---

## 10. 后续可增强方向（未承诺排期）

- 高风险 tool 二次确认、审计日志、只读/写权限分层。
- 特定 `structuredContent` 的卡片化展示。
- Workspace 级团队默认配置共享。
