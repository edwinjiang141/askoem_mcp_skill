# AI Gateway MCP MVP

AI Gateway 的 MCP Server 最小实现，面向 OEM 只读诊断场景。

核心架构分两层：

- **MCP Tool 层（数据层）**：负责认证、OEM 取数、服务自检
- **AI Skill 层（智能层）**：由 LLM 读取 SKILL.md 文档 + OEM 数据，生成结构化诊断回答

主流程：

1. 用户提问，`run_skill` MCP tool 接收问题
2. IntentParser（规则）提取目标名/时间范围/意图类型
3. AlertRouter（规则 + LLM fallback）识别告警场景
4. OEM REST API（只读）拉取 incidents/events/latestData/timeSeries
5. SkillRouter（LLM）根据问题选择最匹配的 Skill
6. SkillExecutor（LLM）按 SKILL.md 的 Workflow/Constraints 生成结构化诊断
7. 返回 4 段格式回答：结论 / 证据 / SOP 建议 / 下一步

## 项目结构

- `src/mcp_server.py`：MCP Server 入口（`oem_login`、`fetch_data_from_oem`、`run_skill`、`health_check`）
- `src/service.py`：数据层编排（问题识别、路由、OEM 取数）+ AI Skill 调用入口
- `src/skill_engine.py`：AI Skill 引擎（SkillRegistry / SkillRouter / SkillExecutor，基于 LangChain + DeepSeek）
- `src/intent_parser.py`：意图识别、目标名抽取、目标类型识别（规则）
- `src/alert_router.py`：告警场景路由（规则优先 + LLM fallback）
- `src/oem_client.py`：OEM REST 客户端（只读，含兼容降级逻辑）
- `src/auth_session.py`：会话缓存（TTL 30 分钟）
- `src/sop_engine.py`：静态 SOP 模板（供 SKILL.md 引用）
- `config/metric_map.yaml`：OEM 接口配置、默认地址、意图映射
- `skills/cpu_alert_mvp/`：CPU 告警诊断 Skill（`SKILL.md` + assets/references/scripts）
- `.env`：LLM 配置（DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL / DEEPSEEK_MODEL）

## 快速启动

### 1) 安装依赖

Windows PowerShell:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) 配置 LLM（DeepSeek）

复制 `.env.example` 为 `.env`，填入 DeepSeek API Key：

```bash
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

AI Skill Engine 通过 `python-dotenv` 从项目根目录 `.env` 加载以上变量。若未配置，`run_skill` 工具会降级返回简单文本摘要。

### 3) 检查 OEM 配置

文件：`config/metric_map.yaml`

关键项：

- `oem_api.default_base_url`
- `oem_api.verify_ssl`（测试环境可用 `false`）
- `oem_api.endpoints.*`

`default_base_url` 支持两种写法：

- `https://host:port`
- `https://host:port/em/api`
- `https://host:port/em`（控制台入口，代码会自动拼接 REST 路径）

### 4) MCP 启动说明

该服务是 **stdio MCP server**，应由 VS Code/Cursor/Cline 的 MCP 客户端拉起。  
不要在交互终端手工输入请求内容。

启动命令（供 MCP 配置使用）：

```bash
python -m src.mcp_server
```

### 5) 中心化部署（推荐，避免每个客户端部署源码）

为避免“每个客户端都安装一份 Python 源码”，可使用 MCP 的 `streamable-http` 方式做中心化部署：

```bash
python -m src.mcp_server_http
```

说明：

- `src.mcp_server_http` 与 `src.mcp_server` 复用同一套 tools/逻辑，不改已有功能。
- 服务端集中部署 1 套即可，客户端通过网络连接该 MCP 服务。
- 适合内网统一运维，便于版本管理和灰度升级。
- 为兼容 Cline 对 `GET /mcp` 的探测，`src.mcp_server_http` 默认使用 `sse` 并挂载 `/mcp`。

可选环境变量：

```bash
AI_GATEWAY_MCP_TRANSPORT=sse            # 默认 sse，可改 streamable-http
AI_GATEWAY_MCP_MOUNT_PATH=/mcp          # 仅 sse 生效
```

建议架构：

1. 在一台统一服务器部署本项目（或容器化部署）。
2. 运行 `python -m src.mcp_server_http` 暴露 MCP HTTP 服务。
3. Cline/Cursor 客户端改为配置远程 MCP 地址，而不是本地 `command + args`。

## MCP 工具

### `oem_login`

参数：

- `oem_base_url`（可选，不传则用配置默认值）
- `username`
- `password`

返回：

- `session_id`

### `fetch_data_from_oem`

纯数据工具，返回 OEM 原始结构化数据，不做诊断推理。

参数：

- `question`（必填）
- `session_id`（推荐）
- 或 `oem_base_url + username + password`

返回（结构化数据）：

- `ok`
- `session_id`（成功时）
- `intent`（识别结果：intent_type / target_name / time_range / metric_keys）
- `routing`（场景路由结果：scenario / classifier / confidence）
- `data`（latestData / timeSeries / incidents / events）

### `run_skill`

AI 诊断统一入口。内部先调用 `fetch_data` 获取 OEM 数据，再通过 AI Skill Engine（LLM）生成结构化诊断。

参数：

- `question`（必填）
- `session_id`（推荐）
- 或 `oem_base_url + username + password`

返回：

- `ok`
- `session_id`（成功时）
- `skill_name`（命中的 Skill 名称，未命中时为 null）
- `result`（LLM 生成的结构化诊断文本，固定 4 段：结论 / 证据 / SOP 建议 / 下一步）

降级行为：若 DEEPSEEK_API_KEY 未配置或 LLM 调用失败，返回简单文本摘要。

### `health_check`

调试与巡检工具，返回服务状态和已加载的工具列表。

## 当前支持的通用查询示例

- `列出当前监控主机的信息，并以表格形式返回`
- `查看 19test1 的监控项有哪些`
- `19test1 cpu 利用率多少`
- `host01 最近 CPU 高告警怎么处理`
- `host01 IO 逻辑读或者物理读高告警，给处理建议`

## AI Skill 架构

### 设计理念

- **MCP Tool 层（数据层）**：负责认证、取数、自检。原子操作，不做推理。
- **AI Skill 层（智能层）**：由 LLM 驱动。Skill 是"可复用的认知能力"，以 SKILL.md 描述，由 LLM 执行。
- **SKILL.md 即 Prompt**：每个 Skill 的 SKILL.md 就是 LLM 的 system prompt。新增诊断场景只需写一个 SKILL.md 文件，无需改 Python 代码。

### AI Skill Engine 组成

- **SkillRegistry**：启动时扫描 `skills/*/SKILL.md`，解析 YAML frontmatter，缓存元信息（name / description / triggers）
- **SkillRouter（LLM）**：将用户问题 + 全部 Skill 摘要发给 DeepSeek，返回最匹配的 Skill 名称
- **SkillExecutor（LLM）**：将完整 SKILL.md 作为 system prompt + OEM 数据作为 context + 用户问题，发给 DeepSeek 生成诊断

技术栈：LangChain 1.0（ChatOpenAI / ChatPromptTemplate / LCEL Chain）+ DeepSeek API

### Skill 目录结构

```text
skills/cpu_alert_mvp/
  SKILL.md                    # Skill 定义（YAML frontmatter + Goal/Workflow/Constraints）
  assets/output_template.md   # 输出模板参考
  references/cpu_alert_sop.md # SOP 参考文档
  scripts/compose_question.py # 辅助脚本
```

SKILL.md 包含：

- YAML frontmatter：name / description / triggers / non_triggers / version / paradigm
- 正文章节：Goal / Decision Tree / Workflow / Constraints / Resources / Validation

### 扩展新 Skill

1. 在 `skills/` 下新建目录（如 `skills/io_alert_mvp/`）
2. 编写 `SKILL.md`，包含 YAML frontmatter 和结构化章节
3. SkillRegistry 自动发现，SkillRouter 自动路由，无需改 Python 代码

## 告警场景路由

采用混合识别模式：

- 优先规则识别（稳定可控）
- 规则不确定时再调用 LLM 分类（DeepSeek）

告警数据主来源为 **OEM incidents/events**。

已内置场景：

- CPU 高告警
- IO 逻辑读/物理读高告警
- 通用告警（无专用 Skill 时兜底）

扩展方式：通过 `config/metric_map.yaml` 的 `alert_scenarios` 增加关键词和配置。

## 端到端流程

### 两条独立路径

- **数据路径**：`fetch_data_from_oem` → 返回原始结构化 JSON（供 Cline 自行分析或展示）
- **AI 诊断路径**：`run_skill` → 内部 fetch_data + AI Skill Engine → 返回 LLM 生成的诊断文本

### AI 诊断完整流程（示例：`host01 最近 CPU 高告警怎么处理`）

```
步骤1  用户提问
       Cline / CLI 调用 run_skill(question="host01 最近 CPU 高告警怎么处理", session_id=...)

步骤2  数据层（规则驱动，不变）
       2a. IntentParser（规则）: 提取 target_name=host01, time_range=24h, intent=单目标诊断
       2b. AlertRouter（规则优先 + LLM fallback）: 识别场景 scenario=cpu_high
       2c. 参数校验: 若命中 CPU/IO 场景但缺少目标名，返回追问
       2d. OEM REST API（只读）: 拉取 incidents / events / latestData / timeSeries

步骤3  AI Skill Engine（LLM 驱动）
       3a. SkillRegistry: 已预加载 skills/*/SKILL.md 的元信息
       3b. SkillRouter（LLM）: 问题 + Skill 摘要 → DeepSeek → 返回 "cpu-alert-diagnosis"
       3c. SkillExecutor（LLM）: SKILL.md 作为 system prompt
                                + OEM 数据（incidents/events/metrics）作为 context
                                + 用户问题
                                → DeepSeek → 按 Workflow/Constraints 生成回答

步骤4  返回结构化诊断
       固定 4 段格式：结论 / 证据 / SOP 建议 / 下一步

步骤5  降级兼容
       若 DEEPSEEK_API_KEY 未配置或 LLM 调用失败，回退到简单文本摘要
```

## 兼容性与容错

- OEM 认证方式：Basic Auth
- 对部分接口参数不兼容时自动降级重试（例如 `targets` 的 `include` 参数）
- 对部分接口不可用时降级处理（例如某些环境 `metricGroups` 可能 404）
- 临时兼容：若测试环境 OEM 版本不支持 `/em/api/incidents`，当前代码会返回一个模拟 incident 以跑通 SOP 链路（代码内保留了恢复真实接口调用的注释位）
- 临时兼容：低版本 OEM 也可能不支持 `.../metricGroups/.../latestData` 相关接口，当前告警流程不依赖该接口，使用“按提问内容构造模拟 incident”方式继续输出 CPU/IO SOP

## 注意事项

- 只读访问，不执行高风险写操作
- 不直连 OEM repository 数据库
- 测试环境可关闭 SSL 校验，生产环境必须开启并使用有效证书
