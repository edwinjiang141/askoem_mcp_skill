from __future__ import annotations

import sys
from typing import Any

from mcp.server.fastmcp import FastMCP

from src.metric_config import load_metric_config
from src.service import AskOpsService


CONFIG_PATH = "config/metric_map.yaml"
SERVER_VERSION = "0.2.0"

config = load_metric_config(CONFIG_PATH)
service = AskOpsService(config)
mcp = FastMCP("ai-gateway-mvp")


@mcp.tool()
def oem_api_login(oem_base_url: str | None, username: str, password: str) -> dict[str, Any]:
    """
    使用 OEM 账号登录并创建会话缓存。
    返回 session_id，后续请求直接复用。
    """
    session_id = service.login(oem_base_url=oem_base_url or "", username=username, password=password)
    return {
        "ok": True,
        "session_id": session_id,
        "message": "登录成功。后续请求可仅传 session_id。",
    }
 

@mcp.tool()
def fetch_data_from_oem(
    question: str,
    session_id: str | None = None,
    oem_base_url: str | None = None,
    username: str | None = None,
    password: str | None = None,
) -> dict[str, Any]:
    """
    数据层工具（MVP）：
    - 传入 session_id（由 oem_login 返回）即可，无需重复登录
    - 或传入 oem_base_url + username + password 自动登录

    执行流程：
    1) 识别问题意图 + 场景路由
    2) 调用 OEM REST API 获取结构化数据

    该 tool 返回原始结构化数据，不负责 SOP 文案组织（诊断由 run_skill 承担）。
    """
    fetched = service.fetch_data(
        question=question,
        session_id=session_id,
        oem_base_url=oem_base_url,
        username=username,
        password=password,
    )
    if fetched.need_follow_up:
        rs = service.build_fetch_data_fact_summary(fetched)
        return {
            "ok": False,
            "session_id": fetched.session_id,
            "generated_sql": fetched.generated_sql,
            "sql_source": fetched.sql_source,
            "result": fetched.follow_up_question,
            "report": service.build_fetch_tool_report(fetched, question),
            "result_summary": rs,
            "llm_summary": "",
        }
    rs = service.build_fetch_data_fact_summary(fetched)
    llm_text = service.build_fetch_llm_summary(question, fetched)
    out: dict[str, Any] = {
        "ok": True,
        "session_id": fetched.session_id,
        "generated_sql": fetched.generated_sql,
        "sql_source": fetched.sql_source,
        "intent": {
            "intent_type": fetched.intent_type,
            "target_name": fetched.target_name,
            "target_type_name": fetched.target_type_name,
            "time_range": fetched.time_range,
            "metric_keys": fetched.metric_keys,
            "route_key": fetched.route_key,
        },
        "routing": {
            "scenario": fetched.scenario,
            "classifier": fetched.classifier,
            "confidence": fetched.confidence,
        },
        "data": {
            "latest_data": fetched.latest_data,
            "metric_time_series": fetched.metric_time_series,
            "incidents": fetched.incidents,
            "events": fetched.events,
        },
        "report": service.build_fetch_tool_report(fetched, question),
        "result_summary": rs,
        "llm_summary": llm_text,
        "result": llm_text if llm_text else rs,
    }
    if fetched.omr_sub_queries:
        out["multi_query"] = True
        out["sub_results"] = [
            {
                "sub_question": s["sub_question"],
                "generated_sql": s["generated_sql"],
                "sql_source": s["sql_source"],
                "data": {
                    "latest_data": s["latest_data"],
                    "metric_time_series": s.get("metric_time_series") or [],
                },
            }
            for s in fetched.omr_sub_queries
        ]
    return out


@mcp.tool()
def execute_omr_sql(
    sql: str | None = None,
    query: str | None = None,
    session_id: str | None = None,
) -> dict[str, Any]:
    """
    在 OMR 资料库上执行前端传入的单条只读 SQL，返回结果结构与 fetch_data_from_oem 成功时一致（含 data、report、generated_sql）。

    前置条件：config 中 data_source.mode 为 omr_db，且已配置 OMR 连接（omr_db / 环境变量）。

    安全策略：与 NL2SQL 相同——仅允许 SELECT；禁止分号与 DDL/DML；SQL 中须引用允许的 OMR 视图白名单。

    参数：sql 与 query 二选一（优先 sql）；部分客户端与其它工具一致只传 query，须兼容。

    说明：session_id 仅作回显，OMR 直连不依赖 OEM 会话。
    """
    sql_text = (sql or query or "").strip()
    return service.execute_omr_sql(sql=sql_text, session_id=session_id)


@mcp.tool()
def run_skill(
    question: str,
    session_id: str | None = None,
    oem_base_url: str | None = None,
    username: str | None = None,
    password: str | None = None,
) -> dict[str, Any]:
    """
    AI 诊断统一入口。

    数据源模式（由 config/metric_map.yaml 的 data_source.mode 决定）：
    - omr_db 模式：直连 OMR 数据库，不需要 OEM 登录，不需要传 session_id/oem_base_url/username/password，只传 question 即可
    - rest 模式：传入 session_id（由 oem_api_login 返回），或传入 oem_base_url + username + password

    执行流程：
    1) 根据 data_source_mode 获取数据（omr_db 走 NL2SQL 直连数据库 / rest 走 OEM REST API）
    2) 通过 AI Skill Engine（SkillRouter + SkillExecutor）生成诊断
    3) 返回 LLM 生成的结构化诊断文本（结论/证据/SOP建议/下一步）

    降级行为：若 DEEPSEEK_API_KEY 未配置或 LLM 调用失败，返回简单文本摘要。
    """
    return service.run_skill_with_llm(
        question=question,
        session_id=session_id,
        oem_base_url=oem_base_url,
        username=username,
        password=password,
    )


@mcp.tool()
def health_check() -> dict[str, Any]:
    """
    调试与巡检工具：
    - 验证 MCP 服务是否在线
    - 验证核心 tools 是否已加载
    - 回显关键运行配置（脱敏）
    """
    return {
        "ok": True,
        "server": "ai-gateway-mvp",
        "version": SERVER_VERSION,
        "tools": ["health_check", "oem_api_login", "fetch_data_from_oem", "execute_omr_sql", "run_skill"],
        "config": {
            "data_source_mode": config.data_source_mode,
            "default_base_url": config.default_base_url,
            "verify_ssl": config.verify_ssl,
        },
        "message": f"服务在线，数据源模式: {config.data_source_mode}。"
                   f"{'omr_db 模式下 run_skill 无需 OEM 登录，直接传 question 即可。' if config.data_source_mode == 'omr_db' else ''}",
    }


if __name__ == "__main__":
    if sys.stdin.isatty():
        sys.stderr.write(
            "检测到当前为交互终端。\n"
            "src.mcp_server 是 stdio MCP 服务，请通过 VS Code/Cursor 的 MCP 客户端启动，"
            "不要在终端手工输入内容。\n"
        )
        sys.exit(1)
    mcp.run()
