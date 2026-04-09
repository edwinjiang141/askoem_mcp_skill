# CPU Alert Diagnosis Skill (MVP)

## 目的
用于 CPU 高告警场景下的标准化诊断输出：
1. 复用 MCP `fetch_data_from_oem` 取证据；
2. 按固定模板输出结论、证据和 SOP 建议。

## 触发条件
- 用户问题包含：CPU / 处理器 / 负载高 / CPU高
- 并且是告警/异常上下文

## 依赖工具
1. `oem_login`（若 session 不存在）
2. `fetch_data_from_oem`

## 执行步骤
1. 校验 session_id；无则先登录。
2. 调用 `fetch_data_from_oem(question, session_id)`。
3. 若返回追问，先向用户追问目标名（例如 host01）。
4. 若 `routing.scenario == cpu_high`，使用 `assets/output_template.md` 渲染。
5. 附加 `references/cpu_alert_sop.md` 中的建议要点。

## 输出约束
- 固定结构：结论 / 证据 / SOP建议 / 下一步
- 不输出敏感凭据
- 不执行写操作

