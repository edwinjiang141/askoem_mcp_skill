from __future__ import annotations

import logging
import os
import sys
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

# MCP 进程 cwd 往往不是仓库根；显式加载项目根 .env，否则 DEEPSEEK_API_KEY 读不到。
_REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_REPO_ROOT / ".env")

from src.mcp_logging import setup_mcp_logging

MCP_LOG_PATH = setup_mcp_logging(_REPO_ROOT)
_log_mcp = logging.getLogger("askoem.mcp")
_log_mcp.info(
    "ai-gateway-mvp starting log_file=%s cwd=%s",
    MCP_LOG_PATH,
    os.getcwd(),
)

from src.metric_config import load_metric_config
from src.service import AskOpsService
from src.skill_engine import resolve_skills_dir


CONFIG_PATH = str(_REPO_ROOT / "config" / "metric_map.yaml")
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
                "generated_sql_resolved": s.get("generated_sql_resolved"),
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

    成功时 result 为与 fetch 相同的纯文本表格（不截断行数）；result_summary 为客观摘要；report 中含完整 SQL 追踪与【数据】表格。

    前置条件：config 中 data_source.mode 为 omr_db，且已配置 OMR 连接（omr_db / 环境变量）。

    安全策略：与 NL2SQL 相同——仅允许 SELECT；禁止分号与 DDL/DML；SQL 中须引用允许的 OMR 视图白名单。

    参数：sql 与 query 二选一（优先 sql）；部分客户端与其它工具一致只传 query，须兼容。

    说明：session_id 仅作回显，OMR 直连不依赖 OEM 会话。
    """
    sql_text = (sql or query or "").strip()
    return service.execute_omr_sql(sql=sql_text, session_id=session_id)


@mcp.tool()
def execute_skill_omr_sql(
    sql: str | None = None,
    query: str | None = None,
    session_id: str | None = None,
) -> dict[str, Any]:
    """
    在 OMR 上执行 Skill 工作流中的只读 SQL（与 execute_omr_sql 分离，不复用其白名单）。

    用途：SKILL.md 中的 gv$session / v$lock 等诊断 SQL；禁止 DML；多条只读语句可用分号分隔，按顺序执行。
    参数：sql 与 query 二选一（优先 sql）。
    前置：data_source.mode 为 omr_db 且已配置 OMR 连接。
    """
    sql_text = (sql or query or "").strip()
    return service.execute_skill_omr_sql(sql=sql_text, session_id=session_id)


@mcp.tool()
def run_skill(
    question: str,
    session_id: str | None = None,
    oem_base_url: str | None = None,
    username: str | None = None,
    password: str | None = None,
    skill_name: str | None = None,
) -> dict[str, Any]:
    """
    AI 诊断统一入口。

    数据源模式（由 config/metric_map.yaml 的 data_source.mode 决定）：
    - omr_db 模式：直连 OMR 数据库，不需要 OEM 登录，不需要传 session_id/oem_base_url/username/password，只传 question 即可
    - rest 模式：传入 session_id（由 oem_api_login 返回），或传入 oem_base_url + username + password

    执行流程：
    1) 加载 skills；若传入 skill_name 或未传则由 SkillRouter 根据问题匹配 Skill
    2) 若已命中注册表中的 Skill：不再先做 NL2SQL 指标查询（避免 trace 中无关 mgmt$metric_current），
       直接按 SKILL.md 工作流执行；只读 SQL 走 execute_skill_omr_sql（视图白名单较 execute_omr_sql 更宽）
    3) 健康检查类问题仍先 fetch_data 模板取数，再走健康 Skill
    4) 其余情况：fetch_data → 必要时 builtin 表格回复或 Skill 诊断

    可选参数 skill_name：显式指定 Skill 名称（须与 SKILL.md frontmatter 的 name 一致）。

    降级行为：若 DEEPSEEK_API_KEY 未配置或 LLM 调用失败，返回简单文本摘要。

    诊断：详见仓库 logs/mcp_server.log 与进程 stderr；health_check 返回 log_file 绝对路径。

    耗时与界面超时：workflow 含「规划 LLM + 只读 SQL + 汇总 LLM」，总耗时常达 60–120 秒。
    VS Code 扩展 OEM Assistant：设置项 alertMcp.mcp.requestTimeoutMs（毫秒）传给 MCP SDK 的 callTool；
    旧版扩展未传该值时 SDK 默认 60000ms，短于总耗时则界面先报 Request timed out，服务端仍可能跑完。
    处理：将该设置调到 180000 以上并重连 MCP；其它 MCP 宿主同理调大单次工具超时。
    """
    t0 = time.perf_counter()
    qprev = (question or "")[:400].replace("\n", " ")
    _log_mcp.info(
        "run_skill tool invoke skill_name=%r question_preview=%r",
        skill_name,
        qprev,
    )
    try:
        out = service.run_skill_with_llm(
            question=question,
            session_id=session_id,
            oem_base_url=oem_base_url,
            username=username,
            password=password,
            skill_name=skill_name,
        )
        elapsed = time.perf_counter() - t0
        _log_mcp.info(
            "run_skill tool done in %.2fs ok=%s skill_name=%s",
            elapsed,
            out.get("ok"),
            out.get("skill_name"),
        )
        if elapsed >= 55.0:
            _log_mcp.warning(
                "run_skill 总耗时 %.1fs ≥55s：若 MCP 客户端 callTool 默认 60s，界面会先超时；"
                "本条仍表示服务端已返回。VS Code：alertMcp.mcp.requestTimeoutMs≥180000。",
                elapsed,
            )
        return out
    except Exception:
        _log_mcp.exception("run_skill tool failed after %.2fs", time.perf_counter() - t0)
        raise


@mcp.tool()
def list_skills() -> dict[str, Any]:
    """
    列出当前已加载的 Skill（来自 skills 目录下各 SKILL.md 的 frontmatter）。

    输入：无。
    输出：skills_dir 解析路径、skills[{name, description}]。
    """
    reg = service._skill_engine.registry
    items = [
        {"name": m.name, "description": m.description}
        for m in reg.skills.values()
    ]
    items.sort(key=lambda x: x["name"])
    return {
        "ok": True,
        "skills_dir": str(resolve_skills_dir()),
        "skills": items,
    }


@mcp.tool()
def reload_skills() -> dict[str, Any]:
    """
    重新扫描 skills 目录并注册 SKILL.md（拷贝新 skill 后可调用，无需重启进程）。

    输入：无。
    输出：与 list_skills 相同结构。
    """
    service._skill_engine.reload_registry()
    reg = service._skill_engine.registry
    items = [
        {"name": m.name, "description": m.description}
        for m in reg.skills.values()
    ]
    items.sort(key=lambda x: x["name"])
    return {
        "ok": True,
        "skills_dir": str(resolve_skills_dir()),
        "skills": items,
        "message": "已重新加载 skills 目录。",
    }


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
        "tools": [
            "health_check",
            "oem_api_login",
            "fetch_data_from_oem",
            "execute_omr_sql",
            "execute_skill_omr_sql",
            "run_skill",
            "list_skills",
            "reload_skills",
        ],
        "config": {
            "data_source_mode": config.data_source_mode,
            "default_base_url": config.default_base_url,
            "verify_ssl": config.verify_ssl,
        },
        "log_file": str(MCP_LOG_PATH),
        "run_skill_note": (
            "run_skill 多轮 LLM，总耗时常超过 60s。VS Code 扩展：设置 alertMcp.mcp.requestTimeoutMs（默认已 180000）"
            "并重连 MCP；详见扩展 McpClientService.callTool 的 timeout 参数。"
        ),
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
