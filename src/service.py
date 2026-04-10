from __future__ import annotations

from dataclasses import dataclass
import re
import os
from typing import Any, Optional

from src.auth_session import OemSession, SessionCache
from src.alert_router import classify_alert_scenario
from src.intent_parser import INTENT_METRIC_LIST, INTENT_TARGET_LIST, is_alert_related_question, parse_intent
from src.llm_classifier import LlmIntentClassifier
from src.metric_config import MetricConfig
from src.nl2sql_engine import OemNl2SqlEngine
from src.omr_client import OmrClient, OmrConfig
from src.oem_client import OemClient, OemDataBundle
from src.skill_engine import AgentSkillsEngine


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
            return {
                "ok": False,
                "session_id": session_id,
                "need_follow_up": False,
                "follow_up_question": None,
                "skill_name": None,
                "result": str(e),
            }

        if fetched.need_follow_up:
            return {
                "ok": False,
                "session_id": fetched.session_id,
                "need_follow_up": True,
                "follow_up_question": fetched.follow_up_question,
                "skill_name": None,
                "result": fetched.follow_up_question,
            }

        # 非诊断类问题（如目标清单/监控项清单）直接返回结构化数据结果，避免无意义进入 Skill 路由。
        if fetched.intent_type in {INTENT_TARGET_LIST, INTENT_METRIC_LIST}:
            return {
                "ok": True,
                "session_id": fetched.session_id,
                "need_follow_up": False,
                "follow_up_question": None,
                "skill_name": "builtin_query_reply",
                "result": self._build_data_reply(fetched),
                "oem_errors": fetched.oem_errors,
            }

        # 步骤 2: 组装 OEM 数据为 Skill Engine 的 context（截断避免 token 超限）
        context = {
            "target_name": fetched.target_name,
            "scenario": fetched.scenario,
            "time_range": fetched.time_range,
            "incidents": fetched.incidents[:20],
            "events": fetched.events[:20],
            "latest_data": fetched.latest_data[:10],
            "metric_time_series": fetched.metric_time_series[:10],
            "oem_errors": fetched.oem_errors,
        }

        # 步骤 3: 调用 AI Skill Engine（SkillRouter 选 Skill -> SkillExecutor 生成诊断）
        result_text, skill_name = self._skill_engine.process(question, context)

        # 步骤 4: 未命中 Skill 时降级
        if skill_name is None:
            result_text = self._build_fallback_summary(fetched)

        return {
            "ok": True,
            "session_id": fetched.session_id,
            "need_follow_up": False,
            "follow_up_question": None,
            "skill_name": skill_name,
            "result": result_text,
            "oem_errors": fetched.oem_errors,
        }

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

    def _build_data_reply(self, fetched: FetchDataResult) -> str:
        """清单类查询的内置结果格式化（不依赖 LLM）。"""
        rows = fetched.latest_data or []
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

        return self._build_fallback_summary(fetched)

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
        alert_related = is_alert_related_question(normalized_question)
        parsed = parse_intent(normalized_question, self._config.intent_metric_map)
        plan = self._nl2sql.generate(normalized_question)
        if not plan:
            follow_up = parsed.follow_up_question or "未能生成可执行 SQL，请补充更明确的目标、指标或时间范围后重试。"
            return FetchDataResult(
                session_id=session_id,
                need_follow_up=True,
                follow_up_question=follow_up,
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

        rows = self._omr_client.execute_sql(plan.sql)
        scenario = None
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
    def _format_table(rows: list[dict[str, str]], headers: list[str]) -> str:
        """生成纯文本表格。rows 为空时返回"未查询到数据。"。"""
        if not rows:
            return "未查询到数据。"
        width: dict[str, int] = {h: len(h) for h in headers}
        for row in rows:
            for h in headers:
                width[h] = max(width[h], len(str(row.get(h, "-"))))

        def fmt_line(values: list[str]) -> str:
            return " ".join(v.ljust(width[h]) for v, h in zip(values, headers))

        header_line = fmt_line(headers)
        dash_line = fmt_line(["-" * len(h) for h in headers])
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
