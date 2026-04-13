from __future__ import annotations

from dataclasses import dataclass
import json
import re
import os
from typing import Any, Optional

from src.auth_session import OemSession, SessionCache
from src.alert_router import classify_alert_scenario
from src.intent_parser import INTENT_METRIC_LIST, INTENT_SINGLE_DIAGNOSIS, INTENT_TARGET_LIST, is_alert_related_question, parse_intent
from src.llm_classifier import LlmIntentClassifier
from src.metric_config import MetricConfig
from src.nl2sql_engine import OemNl2SqlEngine
from src.omr_client import OmrClient, OmrConfig
from src.oem_client import OemClient, OemDataBundle
from src.oracle_health_check import (
    ORACLE_HEALTH_CHECK_SKILL_NAME,
    execute_health_check_bundle,
    extract_health_check_targets,
    is_health_check_question,
    parse_health_check_minutes,
    wants_lock_metrics,
)
from src.oracle_health_tools import run_health_analysis_tools
from src.skill_engine import AgentSkillsEngine


def _has_time_range_phrase(text: str) -> bool:
    """输入：子问题文本。输出：是否含时间范围/趋势类表述（用于混合问题拆段）。"""
    t = text.strip().lower()
    if not t:
        return False
    patterns = (
        r"过去\s*\d+\s*(天|周|小时|分钟|日)",
        r"最近\s*\d+\s*(天|周|小时|分钟)",
        r"(过去|最近)\s*一周",
        r"(24|48|72)\s*小时",
        r"\d+\s*(天|周|小时|分钟)\s*(内|以来)",
        r"时间范围|时段|从\s*.+\s*到|between|last\s+\d+",
        r"趋势|历史|时序|走势|随时间",
        r"今日|昨日|本周|本月|上周",
        r"\b(?:24h|7d|1w|30d)\b",
        r"tr\s*\(\s*sysdate",
    )
    for p in patterns:
        if re.search(p, t, re.IGNORECASE):
            return True
    return False


def _split_mixed_omr_question(question: str) -> list[str] | None:
    """
    输入：整句问题。
    输出：若同时存在「时间范围类」与「非时间范围类」子句（分号或换行分隔），返回子问题列表；否则 None，走单条 NL2SQL。
    """
    raw = question.strip()
    parts = re.split(r"[；;]+|\n+", raw)
    parts = [p.strip() for p in parts if p.strip()]
    if len(parts) < 2:
        return None
    flags = [_has_time_range_phrase(p) for p in parts]
    if not any(flags) or all(flags):
        return None
    return parts


def _try_parse_float_cell(raw: Any) -> float | None:
    """将单元格值尝试解析为 float；失败返回 None（不抛错）。"""
    if raw is None:
        return None
    s = str(raw).strip()
    if s == "" or s == "-":
        return None
    t = s.replace(",", "")
    if t.endswith("%"):
        t = t[:-1].strip()
    try:
        return float(t)
    except ValueError:
        return None


@dataclass
class FetchDataResult:
    session_id: str | None
    need_follow_up: bool
    follow_up_question: str | None
    intent_type: str | None
    target_name: str | None
    target_type_name: str | None
    time_range: str | None
    metric_keys: list[str]
    route_key: str | None
    scenario: str | None
    classifier: str | None
    confidence: float | None
    latest_data: list[dict[str, Any]]
    metric_time_series: list[dict[str, Any]]
    incidents: list[dict[str, Any]]
    events: list[dict[str, Any]]
    oem_errors: list[str] = None  # type: ignore[assignment]
    generated_sql: str | None = None
    sql_source: str | None = None  # template | llm | multi
    omr_sub_queries: Optional[list[dict[str, Any]]] = None  # type: ignore[assignment]
    forced_skill_name: str | None = None

    def __post_init__(self) -> None:
        if self.oem_errors is None:
            self.oem_errors = []


class AskOpsService:
    def __init__(self, config: MetricConfig):
        self._config = config
        self._sessions = SessionCache(ttl_minutes=30)
        self._oem_client = OemClient(
            timeout_seconds=config.timeout_seconds,
            verify_ssl=config.verify_ssl,
        )
        self._llm_classifier = LlmIntentClassifier(timeout_seconds=min(config.timeout_seconds, 15))
        # AI Skill Engine: 启动时扫描 skills/ 目录，预加载所有 SKILL.md 元信息
        self._skill_engine = AgentSkillsEngine()
        self._nl2sql = OemNl2SqlEngine()
        self._omr_client = self._build_omr_client(config)

    @staticmethod
    def _build_omr_client(config: MetricConfig) -> OmrClient | None:
        db_cfg = config.omr_db
        username = str(db_cfg.get("username", "")).strip() or str(os.getenv("OMR_DB_USERNAME", "")).strip()
        password = str(db_cfg.get("password", "")).strip() or str(os.getenv("OMR_DB_PASSWORD", "")).strip()
        dsn = str(db_cfg.get("dsn", "")).strip() or str(os.getenv("OMR_DB_DSN", "")).strip()
        schema = str(db_cfg.get("schema", "SYSMAN")).strip() or "SYSMAN"
        if not username or not password or not dsn:
            return None
        return OmrClient(OmrConfig(username=username, password=password, dsn=dsn, schema=schema))

    def login(self, oem_base_url: str, username: str, password: str) -> str:
        """
        输入：oem_base_url，username，password。
        处理：调用 OEM REST API 登录，生成 session 并缓存。
        输出：session_id。
        失败处理：缺少参数或认证失败抛出 ValueError。
        """
        resolved_base_url = oem_base_url or self._config.default_base_url
        if not resolved_base_url:
            raise ValueError("缺少 oem_base_url，且配置中未设置 default_base_url。")
        token = self._oem_client.login(
            base_url=resolved_base_url,
            targets_endpoint=self._config.endpoints["targets"],
            username=username,
            password=password,
        )
        session = self._sessions.create(
            oem_base_url=resolved_base_url,
            username=username,
            password=password,
            token=token,
        )
        return session.session_id

    # ------------------------------------------------------------------
    # AI 诊断入口（供 run_skill MCP tool 调用）
    # ------------------------------------------------------------------

    def run_skill_with_llm(
        self,
        question: str,
        session_id: Optional[str] = None,
        oem_base_url: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        skill_name: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        AI 诊断统一入口。

        流程：
        1. 调用 fetch_data() 获取 OEM 结构化数据
        2. 将 OEM 数据作为 context 交给 AgentSkillsEngine（LLM 路由 + LLM 执行）
        3. 返回结构化结果字典

        输入: question + 认证参数（session_id 或 oem_base_url/username/password）
        输出: { ok, session_id, need_follow_up, follow_up_question, skill_name, result }
        降级: LLM 不可用时回退到简单文本摘要
        """
        # 步骤 1: 数据层取数（捕获认证异常，避免冒泡导致 Cline 误判为前置条件失败）
        try:
            fetched = self.fetch_data(
                question=question,
                session_id=session_id,
                oem_base_url=oem_base_url,
                username=username,
                password=password,
            )
        except (ValueError, RuntimeError) as e:
            return self._finalize_run_skill_result(
                {
                    "ok": False,
                    "session_id": session_id,
                    "need_follow_up": False,
                    "follow_up_question": None,
                    "skill_name": None,
                    "result": str(e),
                    "oem_errors": [],
                    "generated_sql": None,
                    "sql_source": None,
                },
                question,
                None,
            )

        if fetched.need_follow_up:
            return self._finalize_run_skill_result(
                {
                    "ok": False,
                    "session_id": fetched.session_id,
                    "need_follow_up": True,
                    "follow_up_question": fetched.follow_up_question,
                    "skill_name": None,
                    "result": fetched.follow_up_question,
                    "oem_errors": fetched.oem_errors,
                    "generated_sql": fetched.generated_sql,
                    "sql_source": fetched.sql_source,
                    "omr_sub_queries": fetched.omr_sub_queries,
                },
                question,
                fetched,
            )

        # 非诊断类问题（如目标清单/监控项清单）直接返回结构化数据结果，避免无意义进入 Skill 路由。
        if fetched.intent_type in {INTENT_TARGET_LIST, INTENT_METRIC_LIST}:
            return self._finalize_run_skill_result(
                {
                    "ok": True,
                    "session_id": fetched.session_id,
                    "need_follow_up": False,
                    "follow_up_question": None,
                    "skill_name": "builtin_query_reply",
                    "result": self._build_data_reply(fetched),
                    "oem_errors": fetched.oem_errors,
                    "generated_sql": fetched.generated_sql,
                    "sql_source": fetched.sql_source,
                    "omr_sub_queries": fetched.omr_sub_queries,
                },
                question,
                fetched,
            )

        # omr_db 通用数据查询：有数据行且不是诊断类意图 → 直接格式化为文本表格返回
        if (
            self._config.data_source_mode == "omr_db"
            and fetched.latest_data
            and fetched.intent_type not in {INTENT_SINGLE_DIAGNOSIS, INTENT_TARGET_LIST, INTENT_METRIC_LIST}
        ):
            return self._finalize_run_skill_result(
                {
                    "ok": True,
                    "session_id": fetched.session_id,
                    "need_follow_up": False,
                    "follow_up_question": None,
                    "skill_name": "builtin_query_reply",
                    "result": self._build_data_reply(fetched),
                    "oem_errors": fetched.oem_errors,
                    "generated_sql": fetched.generated_sql,
                    "sql_source": fetched.sql_source,
                    "omr_sub_queries": fetched.omr_sub_queries,
                },
                question,
                fetched,
            )

        # 步骤 2: 组装 context。Oracle 快速健康检查：先跑脚本工具，LLM 只消费 health_tool_results，不注入原始行。
        if (
            fetched.forced_skill_name == ORACLE_HEALTH_CHECK_SKILL_NAME
            and fetched.omr_sub_queries
        ):
            tool_payload = run_health_analysis_tools(
                fetched.omr_sub_queries,
                self._config.default_base_url,
            )
            context: dict[str, Any] = {
                "target_name": fetched.target_name,
                "scenario": fetched.scenario,
                "time_range": fetched.time_range,
                "health_tool_results": tool_payload,
                "oem_console_deep_link": tool_payload.get("oem_console_entry_url", ""),
                "oem_errors": fetched.oem_errors,
                "latest_data": [],
                "metric_time_series": [],
                "incidents": [],
                "events": [],
            }
        else:
            max_ld = 80 if fetched.omr_sub_queries else 10
            context = {
                "target_name": fetched.target_name,
                "scenario": fetched.scenario,
                "time_range": fetched.time_range,
                "incidents": fetched.incidents[:20],
                "events": fetched.events[:20],
                "latest_data": fetched.latest_data[:max_ld],
                "metric_time_series": fetched.metric_time_series[:10],
                "oem_errors": fetched.oem_errors,
            }

        # 步骤 3: 调用 AI Skill Engine（SkillRouter 选 Skill -> SkillExecutor 生成诊断）
        forced = ((skill_name or "").strip() or (fetched.forced_skill_name or "")).strip() or None
        result_text, resolved_skill = self._skill_engine.process(
            question,
            context,
            forced_skill_name=forced,
        )

        # 步骤 4: 未命中 Skill 时降级
        if resolved_skill is None:
            result_text = self._build_fallback_summary(fetched)

        return self._finalize_run_skill_result(
            {
                "ok": True,
                "session_id": fetched.session_id,
                "need_follow_up": False,
                "follow_up_question": None,
                "skill_name": resolved_skill,
                "result": result_text,
                "oem_errors": fetched.oem_errors,
                "generated_sql": fetched.generated_sql,
                "sql_source": fetched.sql_source,
                "omr_sub_queries": fetched.omr_sub_queries,
            },
            question,
            fetched,
        )

    def _run_skill_chart_payload(self, fetched: FetchDataResult) -> dict[str, Any]:
        """与 fetch_data_from_oem 对齐的 data / multi_query 结构，供扩展图表构建。"""
        payload: dict[str, Any] = {
            "data": {
                "latest_data": fetched.latest_data,
                "metric_time_series": fetched.metric_time_series or [],
                "incidents": fetched.incidents or [],
                "events": fetched.events or [],
            },
            "intent": {
                "intent_type": fetched.intent_type,
                "target_name": fetched.target_name,
                "target_type_name": fetched.target_type_name,
                "time_range": fetched.time_range,
                "metric_keys": fetched.metric_keys or [],
                "route_key": fetched.route_key,
            },
            "routing": {
                "scenario": fetched.scenario,
                "classifier": fetched.classifier,
                "confidence": fetched.confidence,
            },
        }
        if fetched.omr_sub_queries:
            payload["multi_query"] = True
            payload["sub_results"] = [
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
        return payload

    def _finalize_run_skill_result(
        self,
        out: dict[str, Any],
        question: str,
        fetched: FetchDataResult | None,
    ) -> dict[str, Any]:
        """为 MCP 工具追加固定版式的 report 字段（纯文本，便于 trace 阅读）。"""
        out["report"] = self.build_run_skill_tool_report(out, question)
        if fetched is not None and out.get("ok") is True:
            out.update(self._run_skill_chart_payload(fetched))
        return out

    def build_run_skill_tool_report(self, result: dict[str, Any], question: str) -> str:
        """run_skill 工具的人类可读报告：含 SQL 执行追踪与诊断正文。"""
        lines: list[str] = []
        lines.append("=== run_skill 诊断报告 ===")
        lines.append("")
        lines.append("【问题】")
        lines.append(question.strip())
        lines.append("")
        lines.append("【SQL 执行追踪】")
        sql = result.get("generated_sql")
        src = result.get("sql_source")
        subs = result.get("omr_sub_queries")
        if subs:
            for i, sub in enumerate(subs, 1):
                lines.append(f"--- 子查询 {i} ---")
                lines.append(f"问题: {sub.get('sub_question', '')}")
                lines.append(f"来源: {sub.get('sql_source', 'unknown')}")
                lines.append("SQL:")
                lines.append(str(sub.get("generated_sql", "")))
        elif sql:
            lines.append(f"来源: {src or 'unknown'}")
            lines.append("SQL:")
            lines.append(str(sql))
        else:
            lines.append("（未生成 NL2SQL：数据源为 REST 或非 omr_db 路径）")
        lines.append("")
        lines.append("【状态】")
        if result.get("ok") is False:
            lines.append("失败" + ("（需要追问）" if result.get("need_follow_up") else ""))
        else:
            lines.append("成功")
        lines.append("")
        lines.append("【诊断结果】")
        lines.append(str(result.get("result", "")))
        oem_errors = result.get("oem_errors") or []
        if oem_errors:
            lines.append("")
            lines.append("【OEM 数据层异常】")
            for i, err in enumerate(oem_errors, 1):
                lines.append(f"{i}. {err}")
        lines.append("")
        lines.append("【元信息】")
        lines.append(f"skill_name: {result.get('skill_name')}")
        lines.append(f"session_id: {result.get('session_id') or '-'}")
        return "\n".join(lines)

    def build_fetch_tool_report(self, fetched: FetchDataResult, question: str) -> str:
        """fetch_data_from_oem 工具的人类可读报告：含 SQL 执行追踪与数据表格。"""
        lines: list[str] = []
        lines.append("=== fetch_data_from_oem 执行报告 ===")
        lines.append("")
        lines.append("【问题】")
        lines.append(question.strip())
        lines.append("")
        lines.append("【SQL 执行追踪】")
        if fetched.omr_sub_queries:
            for i, sub in enumerate(fetched.omr_sub_queries, 1):
                lines.append(f"--- 子查询 {i} ---")
                lines.append(f"问题: {sub.get('sub_question', '')}")
                lines.append(f"来源: {sub.get('sql_source', 'unknown')}")
                lines.append("SQL:")
                lines.append(str(sub.get("generated_sql", "")))
        elif fetched.generated_sql:
            lines.append(f"来源: {fetched.sql_source or 'unknown'}")
            lines.append("SQL:")
            lines.append(fetched.generated_sql)
        else:
            lines.append("（未生成 NL2SQL：数据源为 REST 或非 omr_db 路径）")
        lines.append("")
        lines.append("【状态】")
        lines.append("需要追问" if fetched.need_follow_up else "成功")
        lines.append("")
        lines.append("【意图摘要】")
        lines.append(
            f"intent_type={fetched.intent_type or '-'} | "
            f"target={fetched.target_name or '-'} | "
            f"scenario={fetched.scenario or '-'} | "
            f"time_range={fetched.time_range or '-'}"
        )
        if fetched.oem_errors:
            lines.append("")
            lines.append("【OEM 层异常】")
            for i, err in enumerate(fetched.oem_errors, 1):
                lines.append(f"{i}. {err}")
        lines.append("")
        if fetched.need_follow_up:
            lines.append("【说明】")
            lines.append(fetched.follow_up_question or "")
        else:
            lines.append("【数据】")
            data_text = self._build_data_reply(fetched)
            if data_text == "未查询到数据。" and (fetched.incidents or fetched.events):
                data_text = self._format_incidents_events_snippet(fetched)
            lines.append(data_text)
        lines.append("")
        lines.append("【数据摘要】")
        lines.append(self.build_fetch_data_fact_summary(fetched))
        lines.append("")
        lines.append("【元信息】")
        lines.append(f"session_id: {fetched.session_id or '-'}")
        return "\n".join(lines)

    def build_fetch_data_fact_summary(self, fetched: FetchDataResult) -> str:
        """
        仅基于 FetchDataResult 内已有数据的客观摘要（无 LLM）。
        不推断根因、严重度或处置建议；仅行数、列名、可解析数值的 min/max、低基数去重取值等。
        """
        if fetched.need_follow_up:
            q = (fetched.follow_up_question or "").strip()
            if q:
                return f"未完成取数：需要追问。\n追问内容：{q}"
            return "未完成取数：需要追问。"

        if fetched.omr_sub_queries:
            blocks: list[str] = []
            for i, sub in enumerate(fetched.omr_sub_queries, 1):
                sq = str(sub.get("sub_question", "")).strip()
                rows = sub.get("latest_data") or []
                head = f"--- 子查询 {i}" + (f"({sq})" if sq else "") + " ---"
                body = "\n".join(self._fact_summary_lines_for_rows(rows))
                blocks.append(f"{head}\n{body}")
            aux = self._fact_summary_auxiliary_lists(fetched)
            if aux:
                blocks.append(aux)
            return "\n\n".join(blocks)

        rows = fetched.latest_data or []
        if not rows and (fetched.incidents or fetched.events):
            return "\n".join(self._fact_summary_incidents_events_only(fetched))

        out_lines = self._fact_summary_lines_for_rows(rows)
        aux = self._fact_summary_auxiliary_lists(fetched)
        if aux:
            out_lines.append(aux)
        return "\n".join(out_lines)

    def _compact_fetch_payload_for_llm(self, fetched: FetchDataResult) -> str:
        """供 LLM 总结用的数据片段（JSON 字符串，有长度上限）。"""
        if fetched.omr_sub_queries:
            blocks: list[dict[str, Any]] = []
            for s in fetched.omr_sub_queries:
                rows = s.get("latest_data") or []
                blocks.append(
                    {
                        "sub_question": s.get("sub_question", ""),
                        "row_count": len(rows),
                        "sample_rows": rows[:40],
                    }
                )
            obj: dict[str, Any] = {"mode": "multi_query", "sub_queries": blocks}
        else:
            obj = {
                "latest_data": (fetched.latest_data or [])[:50],
                "metric_time_series": (fetched.metric_time_series or [])[:20],
                "incidents": (fetched.incidents or [])[:20],
                "events_count": len(fetched.events or []),
            }
        raw = json.dumps(obj, ensure_ascii=False, default=str)
        max_len = 14000
        if len(raw) > max_len:
            return raw[:max_len] + "\n…(截断)"
        return raw

    def build_fetch_llm_summary(self, question: str, fetched: FetchDataResult) -> str:
        """
        仅基于客观摘要与数据片段调用 LLM 写自然语言总结；不编造数据中不存在的实体。
        若未配置 DEEPSEEK_API_KEY 或调用失败，返回空字符串（由调用方回退到 result_summary）。
        """
        if fetched.need_follow_up:
            return ""
        api_key = (os.getenv("DEEPSEEK_API_KEY") or "").strip()
        if not api_key:
            return ""
        try:
            from langchain_core.output_parsers import StrOutputParser
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_openai import ChatOpenAI
        except Exception:
            return ""

        base_url = (os.getenv("DEEPSEEK_BASE_URL") or "https://api.deepseek.com").strip()
        model = (os.getenv("DEEPSEEK_MODEL") or "deepseek-chat").strip()
        fact = self.build_fetch_data_fact_summary(fetched)
        payload = self._compact_fetch_payload_for_llm(fetched)
        prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                (
                    "你是 OEM 运维数据解读助手。必须只根据用户提供的「客观摘要」与「数据片段」写总结。\n"
                    "规则：只陈述数据中出现的名称、数值、行数、列名；禁止编造任何未在数据中出现的对象、指标或结论；"
                    "禁止推断根因、严重度、是否需要扩容或变更；禁止补充用户未提供的阈值。\n"
                    "输出：简洁中文，3～8 句；无数据时说明未查到行或仅有事件/时序条数。"
                ),
            ),
            (
                "human",
                "用户问题：{question}\n\n【客观摘要】\n{fact}\n\n【数据片段 JSON】\n{payload}",
            ),
        ])
        try:
            chain = (
                prompt
                | ChatOpenAI(api_key=api_key, base_url=base_url, model=model, temperature=0.0)
                | StrOutputParser()
            )
            return str(chain.invoke({
                "question": question.strip(),
                "fact": fact,
                "payload": payload,
            })).strip()
        except Exception:
            return ""

    def _fact_summary_lines_for_rows(self, rows: list[dict[str, Any]]) -> list[str]:
        """单行集：行数、列名、逐列非空与数值或去重统计。"""
        if not rows:
            return ["未查询到数据行。"]
        n = len(rows)
        headers = AskOpsService._union_keys_in_order(rows)
        max_cols_list = 30
        if len(headers) > max_cols_list:
            col_line = (
                f"列（前 {max_cols_list} 个，共 {len(headers)} 列）: "
                + ", ".join(headers[:max_cols_list])
            )
        else:
            col_line = f"列（共 {len(headers)} 列）: " + ", ".join(headers)
        out: list[str] = [f"行数: {n}", col_line]
        detail_cols = min(len(headers), 25)
        for h in headers[:detail_cols]:
            non_null: list[str] = []
            for r in rows:
                v = r.get(h)
                if v is None:
                    continue
                s = str(v).strip()
                if s == "" or s == "-":
                    continue
                non_null.append(s)
            if not non_null:
                out.append(f"  {h}: 无非空值")
                continue
            parsed = [_try_parse_float_cell(s) for s in non_null]
            if all(p is not None for p in parsed):
                nums = [float(p) for p in parsed if p is not None]
                out.append(
                    f"  {h}: 非空 {len(non_null)}；数值 min={min(nums)}, max={max(nums)}"
                )
            else:
                uniq = sorted(set(non_null))
                if len(uniq) <= 10:
                    shown = uniq[:8]
                    suffix = " ..." if len(uniq) > 8 else ""
                    out.append(
                        f"  {h}: 非空 {len(non_null)}；去重取值（{len(uniq)} 个）: "
                        + ", ".join(shown)
                        + suffix
                    )
                else:
                    out.append(
                        f"  {h}: 非空 {len(non_null)}；去重数 {len(uniq)}（>10，未展开）"
                    )
        if len(headers) > detail_cols:
            out.append(f"（其余 {len(headers) - detail_cols} 列未逐列统计）")
        return out

    def _fact_summary_auxiliary_lists(self, fetched: FetchDataResult) -> str:
        """顶层 metric_time_series / events 条数（不展开）。"""
        parts: list[str] = []
        if fetched.metric_time_series:
            parts.append(f"metric_time_series: {len(fetched.metric_time_series)} 条（未逐点展开）")
        if fetched.events:
            parts.append(f"events: {len(fetched.events)} 条（未逐条展开）")
        return "\n".join(parts) if parts else ""

    def _fact_summary_incidents_events_only(self, fetched: FetchDataResult) -> list[str]:
        """latest_data 为空但存在 incidents/events 时的客观条数。"""
        lines: list[str] = ["latest_data: 0 行"]
        if fetched.incidents:
            lines.append(f"incidents: {len(fetched.incidents)} 条")
            if len(fetched.incidents) <= 5:
                nums = [
                    str(
                        r.get("incidentNum", r.get("incident_num", "-"))
                    )
                    for r in fetched.incidents
                ]
                lines.append("incident 编号: " + ", ".join(nums))
        if fetched.events:
            lines.append(f"events: {len(fetched.events)} 条（未逐条展开）")
        return lines

    def _format_incidents_events_snippet(self, fetched: FetchDataResult) -> str:
        """latest_data 为空但存在 incidents/events 时的简短文本表。"""
        parts: list[str] = []
        if fetched.incidents:
            rows: list[dict[str, str]] = []
            for r in fetched.incidents[:20]:
                rows.append({
                    "num": str(r.get("incidentNum", r.get("incident_num", "-"))),
                    "summary": str(r.get("summaryMsg", r.get("summary_msg", "-"))),
                    "severity": str(r.get("severity", "-")),
                })
            parts.append("incidents（前20条）:\n" + self._format_table(rows, ["num", "summary", "severity"]))
        if fetched.events:
            parts.append(f"events 条数: {len(fetched.events)}（未逐条展开）")
        return "\n\n".join(parts) if parts else "未查询到数据。"

    @staticmethod
    def _build_fallback_summary(fetched: FetchDataResult) -> str:
        """LLM 未命中 Skill 或不可用时的降级文本摘要。"""
        return (
            f"目标: {fetched.target_name or '未指定'}，场景: {fetched.scenario or '未识别'}，"
            f"时间范围: {fetched.time_range}。"
            f"获取到 latestData {len(fetched.latest_data)} 条，"
            f"timeSeries {len(fetched.metric_time_series)} 条，"
            f"incidents {len(fetched.incidents)} 条，events {len(fetched.events)} 条。"
        )

    def _build_sql_result_table_text(self, rows: list[dict[str, Any]]) -> str:
        """按查询返回的行字典原列输出表格（NL2SQL / 通用结果）。"""
        if not rows:
            return "未查询到数据。"
        slice_rows = rows[:50]
        headers = AskOpsService._union_keys_in_order(slice_rows)
        display_rows: list[dict[str, str]] = []
        for r in slice_rows:
            display_rows.append({h: str(r.get(h, "-")) for h in headers})
        table = self._format_table(display_rows, headers)
        return f"查询结果（共 {len(rows)} 行，显示前 {min(len(rows), 50)} 行）：\n{table}"

    def _build_data_reply(self, fetched: FetchDataResult) -> str:
        """查询结果格式化：统一输出可读文本表格（不依赖 LLM）。"""
        rows = fetched.latest_data or []

        if fetched.omr_sub_queries:
            parts: list[str] = []
            for i, sub in enumerate(fetched.omr_sub_queries, 1):
                sq = str(sub.get("sub_question", ""))
                sql = str(sub.get("generated_sql", ""))
                src = str(sub.get("sql_source", ""))
                sub_rows = sub.get("latest_data") or []
                parts.append(
                    f"--- 子查询 {i}: {sq} ---\n"
                    f"来源: {src}\nSQL:\n{sql}\n"
                    + self._build_sql_result_table_text(sub_rows)
                )
            return "\n\n".join(parts)

        # OMR NL2SQL 已执行：必须按 SQL 结果列展示，不能被 intent 误判成「目标清单」等模板覆盖
        if fetched.generated_sql:
            return self._build_sql_result_table_text(rows)

        if fetched.intent_type == INTENT_TARGET_LIST:
            normalized: list[dict[str, str]] = []
            for r in rows[:50]:
                normalized.append({
                    "target_name": str(r.get("target_name", r.get("targetName", "-"))),
                    "target_type": str(r.get("target_type", r.get("targetType", "-"))),
                    "host_name": str(r.get("host_name", r.get("hostName", "-"))),
                })
            table = self._format_table(normalized, ["target_name", "target_type", "host_name"])
            return f"已查询到 {len(rows)} 个目标：\n{table}"

        if fetched.intent_type == INTENT_METRIC_LIST:
            normalized = []
            for r in rows[:80]:
                normalized.append({
                    "metric_group": str(r.get("metricGroupName", r.get("metric_name", "-"))),
                    "metric_column": str(r.get("metricColumn", r.get("metric_column", "-"))),
                })
            table = self._format_table(normalized, ["metric_group", "metric_column"])
            return f"目标 {fetched.target_name or '-'} 的监控项共 {len(rows)} 条：\n{table}"

        # 通用查询结果（REST 等，无 NL2SQL）：合并所有行的键作为列名
        return self._build_sql_result_table_text(rows)

    # ------------------------------------------------------------------
    # execute_omr_sql（供 MCP tool 直接执行用户 SQL，仅 omr_db + 与 NL2SQL 相同的安全策略）
    # ------------------------------------------------------------------

    _MAX_EXECUTE_OMR_SQL_ROWS = 500

    def execute_omr_sql(self, sql: str, session_id: Optional[str] = None) -> dict[str, Any]:
        """
        在 OMR 上执行用户提交的只读 SQL，返回与 fetch_data_from_oem 成功时一致的字典结构。

        输入: sql（单条 SELECT），session_id（可选，仅回显）
        处理: 与 NL2SQL 相同的安全检查 -> OmrClient.execute_sql
        输出: ok / data / report / generated_sql / sql_source=user
        失败: ok False + result + report
        """
        sql_stripped = (sql or "").strip()
        if not sql_stripped:
            return {
                "ok": False,
                "session_id": session_id,
                "generated_sql": None,
                "sql_source": "user",
                "result": "SQL 不能为空。",
                "report": "=== execute_omr_sql 执行报告 ===\n\n【错误】\nSQL 不能为空。\n",
            }

        if self._config.data_source_mode != "omr_db":
            return {
                "ok": False,
                "session_id": session_id,
                "generated_sql": sql_stripped,
                "sql_source": "user",
                "result": "仅当 config 中 data_source.mode 为 omr_db 时支持本工具。",
                "report": (
                    "=== execute_omr_sql 执行报告 ===\n\n【SQL】\n"
                    f"{sql_stripped}\n\n【错误】\n当前数据源不是 omr_db。\n"
                ),
            }

        if not self._omr_client:
            self._omr_client = self._build_omr_client(self._config)
        if not self._omr_client:
            return {
                "ok": False,
                "session_id": session_id,
                "generated_sql": sql_stripped,
                "sql_source": "user",
                "result": "未配置 OMR 数据库连接（username/password/dsn）。",
                "report": (
                    "=== execute_omr_sql 执行报告 ===\n\n【SQL】\n"
                    f"{sql_stripped}\n\n【错误】\n未配置 OMR 连接。\n"
                ),
            }

        safe, reason = OemNl2SqlEngine._is_safe_sql(sql_stripped)
        if not safe:
            return {
                "ok": False,
                "session_id": session_id,
                "generated_sql": sql_stripped,
                "sql_source": "user",
                "result": f"安全检查未通过: {reason}",
                "report": (
                    "=== execute_omr_sql 执行报告 ===\n\n【SQL】\n"
                    f"{sql_stripped}\n\n【错误】\n安全检查未通过: {reason}\n"
                ),
            }

        try:
            rows = self._omr_client.execute_sql(sql_stripped)
        except Exception as e:
            return {
                "ok": False,
                "session_id": session_id,
                "generated_sql": sql_stripped,
                "sql_source": "user",
                "result": str(e),
                "report": (
                    "=== execute_omr_sql 执行报告 ===\n\n【SQL】\n"
                    f"{sql_stripped}\n\n【错误】\n{e}\n"
                ),
            }

        oem_errors: list[str] = []
        if len(rows) > self._MAX_EXECUTE_OMR_SQL_ROWS:
            rows = rows[: self._MAX_EXECUTE_OMR_SQL_ROWS]
            oem_errors.append(f"结果已截断为前 {self._MAX_EXECUTE_OMR_SQL_ROWS} 行")

        fetched = FetchDataResult(
            session_id=session_id,
            need_follow_up=False,
            follow_up_question=None,
            intent_type=None,
            target_name=None,
            target_type_name=None,
            time_range=None,
            metric_keys=[],
            route_key=None,
            scenario=None,
            classifier="execute_omr_sql",
            confidence=None,
            latest_data=rows,
            metric_time_series=[],
            incidents=[],
            events=[],
            oem_errors=oem_errors,
            generated_sql=sql_stripped,
            sql_source="user",
        )
        report = self.build_fetch_tool_report(fetched, sql_stripped)
        report = report.replace(
            "=== fetch_data_from_oem 执行报告 ===",
            "=== execute_omr_sql 执行报告 ===",
            1,
        )
        rs = self.build_fetch_data_fact_summary(fetched)
        llm_s = self.build_fetch_llm_summary(sql_stripped, fetched)

        return {
            "ok": True,
            "session_id": session_id,
            "generated_sql": sql_stripped,
            "sql_source": "user",
            "intent": {
                "intent_type": None,
                "target_name": None,
                "target_type_name": None,
                "time_range": None,
                "metric_keys": [],
                "route_key": None,
            },
            "routing": {
                "scenario": None,
                "classifier": "execute_omr_sql",
                "confidence": None,
            },
            "data": {
                "latest_data": rows,
                "metric_time_series": [],
                "incidents": [],
                "events": [],
            },
            "report": report,
            "result_summary": rs,
            "llm_summary": llm_s,
            "result": llm_s if llm_s else rs,
        }

    # ------------------------------------------------------------------
    # 数据层入口（供 fetch_data_from_oem MCP tool 和 run_skill_with_llm 复用）
    # ------------------------------------------------------------------

    def fetch_data(
        self,
        question: str,
        session_id: Optional[str] = None,
        oem_base_url: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
    ) -> FetchDataResult:
        """
        数据层统一入口。

        只做三件事：
        A. 问题识别（intent/target/time_range）
        B. 场景路由（cpu_high/io_high/...）
        C. OEM 取数（latestData/timeSeries/incidents/events）

        不做 Skill 渲染；Skill 由 run_skill_with_llm() 触发。
        """
        if self._config.data_source_mode == "omr_db":
            return self._fetch_data_from_omr(question=question, session_id=session_id)

        alert_related = is_alert_related_question(question)
        parsed = parse_intent(question, self._config.intent_metric_map)
        if parsed.need_follow_up and not alert_related:
            return FetchDataResult(
                session_id=session_id,
                need_follow_up=True,
                follow_up_question=parsed.follow_up_question,
                intent_type=parsed.intent_type,
                target_name=parsed.target_name,
                target_type_name=parsed.target_type_name,
                time_range=parsed.time_range,
                metric_keys=parsed.metric_keys,
                route_key=parsed.route_key,
                scenario=None,
                classifier=None,
                confidence=None,
                latest_data=[],
                metric_time_series=[],
                incidents=[],
                events=[],
            )

        session = self._resolve_session(
            session_id=session_id,
            oem_base_url=oem_base_url,
            username=username,
            password=password,
        )

        if parsed.intent_type == INTENT_TARGET_LIST:
            host_rows = self._oem_client.list_hosts_with_details(
                session=session,
                endpoints=self._config.endpoints,
                limit=200,
            )
            return FetchDataResult(
                session_id=session.session_id,
                need_follow_up=False,
                follow_up_question=None,
                intent_type=parsed.intent_type,
                target_name=parsed.target_name,
                target_type_name=parsed.target_type_name,
                time_range=parsed.time_range,
                metric_keys=[],
                route_key=parsed.route_key,
                scenario=None,
                classifier=None,
                confidence=None,
                latest_data=host_rows,
                metric_time_series=[],
                incidents=[],
                events=[],
            )

        if parsed.intent_type == INTENT_METRIC_LIST and parsed.target_name:
            groups = self._oem_client.list_metric_groups(
                session=session,
                endpoints=self._config.endpoints,
                target_name=parsed.target_name,
                target_type_name=parsed.target_type_name,
                limit=200,
            )
            group_names = [x.get("metricGroupName") for x in groups if isinstance(x.get("metricGroupName"), str)]
            if not group_names:
                group_names = [x.get("name") for x in groups if isinstance(x.get("name"), str)]
            group_names = [x for x in group_names if x]
            metric_rows = [{"metricGroupName": x} for x in group_names]
            return FetchDataResult(
                session_id=session.session_id,
                need_follow_up=False,
                follow_up_question=None,
                intent_type=parsed.intent_type,
                target_name=parsed.target_name,
                target_type_name=parsed.target_type_name,
                time_range=parsed.time_range,
                metric_keys=[],
                route_key=parsed.route_key,
                scenario=None,
                classifier=None,
                confidence=None,
                latest_data=metric_rows,
                metric_time_series=[],
                incidents=[],
                events=[],
            )

        scenario = None
        classifier = None
        confidence: float | None = None
        if alert_related:
            route = classify_alert_scenario(
                question=question,
                alert_scenarios=self._config.alert_scenarios,
                llm=self._llm_classifier,
            )
            route_cfg = self._config.alert_scenarios.get(route.scenario, {})
            if route_cfg.get("require_target") and not parsed.target_name:
                return FetchDataResult(
                    session_id=session.session_id,
                    need_follow_up=True,
                    follow_up_question="该告警场景需要目标名称，请补充主机名（例如：host01）。",
                    intent_type=parsed.intent_type,
                    target_name=parsed.target_name,
                    target_type_name=parsed.target_type_name,
                    time_range=parsed.time_range,
                    metric_keys=parsed.metric_keys,
                    route_key=parsed.route_key,
                    scenario=route.scenario,
                    classifier=route.classifier,
                    confidence=route.confidence,
                    latest_data=[],
                    metric_time_series=[],
                    incidents=[],
                    events=[],
                )
            scenario = route.scenario
            classifier = route.classifier
            confidence = route.confidence

        # OEM 取数：任意 API 404/超时等不阻断流程，用空数据继续（OEM 版本兼容问题后续修复）
        oem_errors: list[str] = []

        try:
            bundle = self._oem_client.fetch_bundle(
                session=session,
                endpoints=self._config.endpoints,
                target_name=parsed.target_name,
                route_config=self._merge_route_target_type(
                    self._config.intent_metric_map.get(parsed.route_key or "", {}),
                    parsed.target_type_name,
                ),
                time_range=parsed.time_range,
            )
        except RuntimeError as e:
            oem_errors.append(str(e))
            bundle = OemDataBundle(
                target={},
                latest_data=[],
                metric_time_series=[],
                incidents=[],
                events=[],
            )

        incidents = bundle.incidents
        events = bundle.events
        if scenario:
            try:
                incidents = self._oem_client.list_recent_incidents(
                    session=session,
                    endpoints=self._config.endpoints,
                    target_name=parsed.target_name,
                    target_type_name=parsed.target_type_name if parsed.target_name else None,
                    scenario=scenario,
                    question=question,
                    age_hours=24,
                    limit=50,
                )
            except RuntimeError as e:
                oem_errors.append(str(e))
                incidents = []

            try:
                events = self._oem_client.list_events_by_incidents(
                    session=session,
                    endpoints=self._config.endpoints,
                    incidents=incidents,
                )
            except RuntimeError as e:
                oem_errors.append(str(e))
                events = []

        return FetchDataResult(
            session_id=session.session_id,
            need_follow_up=False,
            follow_up_question=None,
            intent_type=parsed.intent_type,
            target_name=parsed.target_name,
            target_type_name=parsed.target_type_name,
            time_range=parsed.time_range,
            metric_keys=parsed.metric_keys,
            route_key=parsed.route_key,
            scenario=scenario,
            classifier=classifier,
            confidence=confidence,
            latest_data=bundle.latest_data,
            metric_time_series=bundle.metric_time_series,
            incidents=incidents,
            events=events,
            oem_errors=oem_errors,
        )

    def _fetch_data_from_omr(self, question: str, session_id: Optional[str] = None) -> FetchDataResult:
        if not self._omr_client:
            self._omr_client = self._build_omr_client(self._config)
        if not self._omr_client:
            raise RuntimeError(
                "当前配置为 omr_db，但缺少 omr_db 连接配置（username/password/dsn）。"
                "请确认 config/metric_map.yaml 已生效，并在修改配置后重启 MCP 服务；"
                "也可使用环境变量 OMR_DB_USERNAME / OMR_DB_PASSWORD / OMR_DB_DSN。"
            )

        normalized_question = self._normalize_omr_question(question)

        # parse_intent 仅用于提取元数据（intent_type/target_name/time_range），不做 follow_up 门禁
        parsed = parse_intent(normalized_question, self._config.intent_metric_map)

        parts = _split_mixed_omr_question(normalized_question)
        if parts and len(parts) >= 2:
            return self._fetch_data_from_omr_multi(parts, normalized_question, session_id, parsed)

        return self._fetch_data_from_omr_single(normalized_question, session_id, parsed)

    def _fetch_data_from_omr_multi(
        self,
        parts: list[str],
        normalized_question: str,
        session_id: Optional[str],
        parsed: Any,
    ) -> FetchDataResult:
        """混合时间范围/快照子问题：逐段 NL2SQL；任一段失败则回退整句单条 SQL。"""
        sub_results: list[dict[str, Any]] = []
        for sq in parts:
            plan = self._nl2sql.generate(sq)
            if not plan:
                return self._fetch_data_from_omr_single(normalized_question, session_id, parsed)
            rows = self._omr_client.execute_sql(plan.sql)
            sub_results.append({
                "sub_question": sq,
                "generated_sql": plan.sql,
                "sql_source": plan.source,
                "latest_data": rows,
                "metric_time_series": [],
            })
        merged_latest: list[dict[str, Any]] = []
        for i, sub in enumerate(sub_results):
            for r in sub["latest_data"]:
                rr = dict(r)
                rr["_sub_query_index"] = i + 1
                rr["_sub_question"] = sub["sub_question"]
                merged_latest.append(rr)
        scenario = None
        if is_alert_related_question(normalized_question):
            route = classify_alert_scenario(
                question=normalized_question,
                alert_scenarios=self._config.alert_scenarios,
                llm=self._llm_classifier,
            )
            scenario = route.scenario
        return FetchDataResult(
            session_id=session_id,
            need_follow_up=False,
            follow_up_question=None,
            intent_type=parsed.intent_type,
            target_name=parsed.target_name,
            target_type_name=parsed.target_type_name,
            time_range=parsed.time_range,
            metric_keys=parsed.metric_keys,
            route_key=parsed.route_key,
            scenario=scenario,
            classifier="nl2sql_multi",
            confidence=0.75,
            latest_data=merged_latest,
            metric_time_series=[],
            incidents=[],
            events=[],
            oem_errors=[],
            generated_sql=None,
            sql_source="multi",
            omr_sub_queries=sub_results,
        )

    def _fetch_data_from_omr_single(
        self,
        normalized_question: str,
        session_id: Optional[str],
        parsed: Any,
    ) -> FetchDataResult:
        # Oracle 快速健康检查：SYSMAN.MGMT$METRIC_DETAILS 分块模板 SQL，优先于 NL2SQL
        if is_health_check_question(normalized_question):
            targets = extract_health_check_targets(normalized_question)
            if not targets:
                return FetchDataResult(
                    session_id=session_id,
                    need_follow_up=True,
                    follow_up_question=(
                        "健康检查需要 1～5 个监控目标名（主机名或数据库实例名等），"
                        "请写在问题中，例如：「对 host01、db2 做最近 30 分钟健康检查」。"
                    ),
                    intent_type=INTENT_SINGLE_DIAGNOSIS,
                    target_name=parsed.target_name,
                    target_type_name=parsed.target_type_name,
                    time_range=parsed.time_range,
                    metric_keys=parsed.metric_keys,
                    route_key=parsed.route_key,
                    scenario=None,
                    classifier=None,
                    confidence=None,
                    latest_data=[],
                    metric_time_series=[],
                    incidents=[],
                    events=[],
                )
            minutes = parse_health_check_minutes(normalized_question)
            include_lock = wants_lock_metrics(normalized_question)
            try:
                sub_results = execute_health_check_bundle(
                    self._omr_client,
                    targets,
                    minutes,
                    include_lock,
                )
            except Exception as e:
                return FetchDataResult(
                    session_id=session_id,
                    need_follow_up=True,
                    follow_up_question=f"健康检查 SQL 执行失败: {e}",
                    intent_type=INTENT_SINGLE_DIAGNOSIS,
                    target_name=targets[0] if len(targets) == 1 else ",".join(targets),
                    target_type_name=parsed.target_type_name,
                    time_range=parsed.time_range,
                    metric_keys=parsed.metric_keys,
                    route_key=parsed.route_key,
                    scenario=None,
                    classifier="health_check_template",
                    confidence=None,
                    latest_data=[],
                    metric_time_series=[],
                    incidents=[],
                    events=[],
                )
            merged_latest: list[dict[str, Any]] = []
            for i, sub in enumerate(sub_results):
                for r in sub["latest_data"]:
                    rr = dict(r)
                    rr["_sub_query_index"] = i + 1
                    rr["_sub_question"] = sub["sub_question"]
                    merged_latest.append(rr)
            scenario_h: str | None = None
            if is_alert_related_question(normalized_question):
                route_h = classify_alert_scenario(
                    question=normalized_question,
                    alert_scenarios=self._config.alert_scenarios,
                    llm=self._llm_classifier,
                )
                scenario_h = route_h.scenario
            tn = targets[0] if len(targets) == 1 else ",".join(targets)
            return FetchDataResult(
                session_id=session_id,
                need_follow_up=False,
                follow_up_question=None,
                intent_type=INTENT_SINGLE_DIAGNOSIS,
                target_name=tn,
                target_type_name=parsed.target_type_name,
                time_range=parsed.time_range,
                metric_keys=parsed.metric_keys,
                route_key=parsed.route_key,
                scenario=scenario_h,
                classifier="health_check_template",
                confidence=0.9,
                latest_data=merged_latest,
                metric_time_series=[],
                incidents=[],
                events=[],
                oem_errors=[],
                generated_sql=None,
                sql_source="health_check_template",
                omr_sub_queries=sub_results,
                forced_skill_name=ORACLE_HEALTH_CHECK_SKILL_NAME,
            )

        # NL2SQL 是 omr_db 模式的默认决策者
        plan = self._nl2sql.generate(normalized_question)
        if not plan:
            rejection_detail = ""
            if self._nl2sql.last_rejection:
                rejection_detail = (
                    f"\nLLM 生成的 SQL 被拒绝:\n"
                    f"  SQL: {self._nl2sql.last_rejection.sql}\n"
                    f"  原因: {self._nl2sql.last_rejection.reason}"
                )
            return FetchDataResult(
                session_id=session_id,
                need_follow_up=True,
                follow_up_question=(
                    f"NL2SQL 未能为该问题生成可执行 SQL。{rejection_detail}\n"
                    f"已识别意图: {parsed.intent_type or '未知'}，目标: {parsed.target_name or '未指定'}。\n"
                    f"支持的视图: MGMT$TARGET, MGMT$INCIDENTS, SYSMAN.MGMT$METRIC_CURRENT 等。\n"
                    f"请尝试更具体的问题，例如：'列出所有主机'、'omrd 的当前指标值'、'当前未关闭的告警有哪些'。"
                ),
                intent_type=parsed.intent_type,
                target_name=parsed.target_name,
                target_type_name=parsed.target_type_name,
                time_range=parsed.time_range,
                metric_keys=parsed.metric_keys,
                route_key=parsed.route_key,
                scenario=None,
                classifier=None,
                confidence=None,
                latest_data=[],
                metric_time_series=[],
                incidents=[],
                events=[],
            )

        # 执行 SQL
        rows = self._omr_client.execute_sql(plan.sql)

        # 告警场景分类（仅在问题涉及告警时）
        scenario = None
        alert_related = is_alert_related_question(normalized_question)
        if alert_related:
            route = classify_alert_scenario(
                question=normalized_question,
                alert_scenarios=self._config.alert_scenarios,
                llm=self._llm_classifier,
            )
            scenario = route.scenario

        return FetchDataResult(
            session_id=session_id,
            need_follow_up=False,
            follow_up_question=None,
            intent_type=parsed.intent_type,
            target_name=parsed.target_name,
            target_type_name=parsed.target_type_name,
            time_range=parsed.time_range,
            metric_keys=parsed.metric_keys,
            route_key=parsed.route_key,
            scenario=scenario,
            classifier=f"nl2sql_{plan.source}",
            confidence=0.8 if plan.source == "template" else 0.7,
            latest_data=rows,
            metric_time_series=[],
            incidents=[],
            events=[],
            oem_errors=[],
            generated_sql=plan.sql,
            sql_source=plan.source,
        )

    # ------------------------------------------------------------------
    # 内部工具方法
    # ------------------------------------------------------------------

    @staticmethod
    def _merge_route_target_type(route_config: dict[str, Any], target_type_name: str) -> dict[str, Any]:
        """合并路由配置与目标类型名。"""
        merged = dict(route_config)
        merged["target_type_name"] = target_type_name
        return merged

    @staticmethod
    def _union_keys_in_order(rows: list[dict[str, Any]]) -> list[str]:
        """合并多行字典的全部键，顺序为：先按首行键序，再追加仅在后行出现的键。"""
        seen: set[str] = set()
        ordered: list[str] = []
        for r in rows:
            for k in r.keys():
                if k not in seen:
                    seen.add(k)
                    ordered.append(k)
        return ordered

    @staticmethod
    def _format_table(rows: list[dict[str, str]], headers: list[str]) -> str:
        """生成纯文本表格。rows 为空时返回"未查询到数据。"。单元格不截断，完整显示。"""
        if not rows:
            return "未查询到数据。"
        width: dict[str, int] = {h: len(h) for h in headers}
        for row in rows:
            for h in headers:
                width[h] = max(width[h], len(str(row.get(h, "-"))))

        def fmt_line(values: list[str]) -> str:
            return " | ".join(str(v).ljust(width[h]) for v, h in zip(values, headers))

        header_line = fmt_line(headers)
        dash_line = "-+-".join("-" * width[h] for h in headers)
        row_lines = [fmt_line([str(r.get(h, "-")) for h in headers]) for r in rows]
        return "\n".join([header_line, dash_line, *row_lines])

    @staticmethod
    def _normalize_omr_question(question: str) -> str:
        cleaned = re.sub(r"@[A-Za-z0-9_:-]+\s*", "", question).strip()
        return cleaned or question.strip()

    def _resolve_session(
        self,
        session_id: Optional[str],
        oem_base_url: Optional[str],
        username: Optional[str],
        password: Optional[str],
    ) -> OemSession:
        if session_id:
            session = self._sessions.get(session_id)
            if session:
                return session
            raise ValueError("session_id 无效或已过期，请重新登录。")

        if not oem_base_url or not username or not password:
            fallback_base = oem_base_url or self._config.default_base_url
            if fallback_base and username and password:
                oem_base_url = fallback_base
            else:
                raise ValueError("缺少认证参数。请提供 session_id，或提供 oem_base_url + username + password。")
        new_session_id = self.login(oem_base_url=oem_base_url, username=username, password=password)
        session = self._sessions.get(new_session_id)
        if not session:
            raise RuntimeError("会话创建失败，请重试。")
        return session
