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
def oem_login(oem_base_url: str | None, username: str, password: str) -> dict[str, Any]:
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
        return {
            "ok": False,
            "session_id": fetched.session_id,
            "result": fetched.follow_up_question,
        }
    return {
        "ok": True,
        "session_id": fetched.session_id,
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
    }


@mcp.tool()
def run_skill(
    question: str,
    session_id: str | None = None,
    oem_base_url: str | None = None,
    username: str | None = None,
    password: str | None = None,
) -> dict[str, Any]:
    """
    AI 诊断统一入口（认证方式与 fetch_data_from_oem 相同）：
    - 传入 session_id（由 oem_login 返回）即可，无需重复登录
    - 或传入 oem_base_url + username + password 自动登录

    执行流程：
    1) 内部调用 fetch_data 获取 OEM 结构化数据（复用已有 session）
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
        "tools": ["health_check", "oem_login", "fetch_data_from_oem", "run_skill"],
        "config": {
            "default_base_url": config.default_base_url,
            "verify_ssl": config.verify_ssl,
        },
        "message": "服务在线，核心工具已加载。",
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
