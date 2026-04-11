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
