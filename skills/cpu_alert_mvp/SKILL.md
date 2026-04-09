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
4. 若 `routing.scenario == cpu_high`，进入 Skill 渲染：
   - 优先 AI 渲染：基于 `SKILL.md` + `references/cpu_alert_sop.md` + OEM证据生成结构化输出；
   - 失败回退：使用 `assets/output_template.md` + 本地 SOP 规则输出。
5. 若场景不匹配（非 cpu_high），返回 Skill 未命中提示并建议改写问题。

## AI 输出 Schema（约束）
- `conclusion`: string
- `evidence`: string
- `sop`: string
- `next_step`: string

## 输出约束
- 固定结构：结论 / 证据 / SOP建议 / 下一步
- 不输出敏感凭据
- 不执行写操作
