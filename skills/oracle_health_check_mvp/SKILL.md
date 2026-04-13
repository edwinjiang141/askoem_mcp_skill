---
name: oracle-db-quick-health
description: >-
  对指定 Oracle 监控目标做「快速健康巡检」：由预设脚本工具完成分块统计与跨块对照，LLM 仅将工具输出整理为四段正文。
  Use when the user asks for a quick health check, health inspection, or multi-dimension Oracle DB/instance status in a time window.
  触发场景：健康检查、快速巡检、最近 N 分钟指标概览、多目标对比巡检。
  不触发：单一 CPU 高告警处置 SOP（请用 cpu-alert-diagnosis）、纯 NL2SQL 即席查询、自动变更或修复。
triggers:
  - 健康检查
  - 快速检查
  - 快速健康
  - health check
  - quick health
non_triggers:
  - CPU 高告警单独处置
  - 仅列出主机清单
  - 容量规划与扩容决策
version: "1.1"
paradigm: operator
---

# Oracle DB Quick Health Check

## Goal
`context.health_tool_results` 已由 **`src/oracle_health_tools.py`** 运行完成：分块形态、IO/Wait 跨块对照、OEM 控制台入口 URL。LLM **不得**根据原始指标行自行重算尖峰或跨块关系，只负责将已有结构化结果写成可读四段。

## 预置工具（脚本，非 LLM）
| 工具 | 实现位置 | 作用 |
|------|----------|------|
| `tool_analyze_section_block` | `oracle_health_tools.tool_analyze_section_block` | 单块内可解析数值序列：统计量 + `pattern`（spike / sustained_high / flat / insufficient_data） |
| `tool_cross_block_compare` | `oracle_health_tools.tool_cross_block_compare` | IO 与 Wait 两块形态对齐：both_stressed / both_calm / mixed / insufficient |
| `tool_oem_console_entry_url` | `oracle_health_tools.tool_oem_console_entry_url` | MVP：**仅**生成企业管理器入口 `{default_base_url}/em` 或缺省提示 |
| `run_health_analysis_tools` | `oracle_health_tools.run_health_analysis_tools` | 编排：逐块分析 → 跨块 → 控制台 URL |

## Workflow
1. **运行时已在 `run_skill` 前执行**：`run_health_analysis_tools(omr_sub_queries, default_base_url)`，结果写入 `context.health_tool_results` 与 `context.oem_console_deep_link`。
2. **LLM 本步**：阅读 `health_tool_results.sections`、`health_tool_results.cross_block`，引用 `stats` / `pattern` / `notes` 写「结论」「证据」；「下一步建议」须与工具结论一致。
3. **LLM 本步**：第 4 段「深挖入口」**仅**输出 `oem_console_deep_link`（或 `health_tool_results.oem_console_entry_url`）中的 OEM 控制台入口说明；**不**写 Grafana、**不**写知识库路径（MVP）。

## Constraints
- 输出固定 **4 段**（中文）：**结论** / **证据** / **下一步建议**（≤3 条） / **深挖入口**
- **证据**须引用 `health_tool_results` 中的字段名与取值（如 `pattern`、`io_wait_alignment`、`stats`），不得编造工具未给出的判定
- **深挖入口（第 4 段）**：MVP **只**允许 OEM 企业管理器控制台入口（与 `oem_console_deep_link` 一致）；禁止 Grafana、外部文档链接
- 不输出凭据；不执行写操作

## Validation
- 四段齐全；证据可与 `health_tool_results` JSON 逐项对照
- 第 4 段仅含 OEM 控制台相关文字
