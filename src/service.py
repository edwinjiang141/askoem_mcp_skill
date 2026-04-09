from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

from src.auth_session import OemSession, SessionCache
from src.alert_router import classify_alert_scenario
from src.intent_parser import INTENT_METRIC_LIST, INTENT_TARGET_LIST, is_alert_related_question, parse_intent
from src.knowledge_base import SingleDocKnowledgeBase
from src.llm_classifier import LlmIntentClassifier
from src.metric_config import MetricConfig
from src.oem_client import OemClient
from src.skill_engine import render_cpu_alert_skill
from src.sop_engine import build_sop_recommendation


@dataclass
class AskOpsResult:
    session_id: str | None
    need_follow_up: bool
    follow_up_question: str | None
    final_result: str | None


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


class AskOpsService:
    def __init__(self, config: MetricConfig):
        self._config = config
        self._sessions = SessionCache(ttl_minutes=30)
        self._oem_client = OemClient(
            timeout_seconds=config.timeout_seconds,
            verify_ssl=config.verify_ssl,
        )
        self._llm_classifier = LlmIntentClassifier(timeout_seconds=min(config.timeout_seconds, 15))

    def login(self, oem_base_url: str, username: str, password: str) -> str:
        """
        设计说明：
        - 输入：oem_base_url，username，password。
        - 处理：调用 OEM REST API 登录，生成 session，并缓存（session_id）。
        - 输出：session_id。供后续会话（如 Cline 插件继续提问）复用。后续提问无需重复调用 login，只需传 session_id。
        - 失败处理：缺少参数或认证失败抛出 ValueError，保证入口调用规范。
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
        # 创建会话并缓存，session_id 会被用于后续 CLI/Cline 请求中的复用
        session = self._sessions.create(
            oem_base_url=resolved_base_url,
            username=username,
            password=password,
            token=token,
        )
        return session.session_id

    def ask(
        self,
        question: str,
        kb_path: str,
        session_id: Optional[str] = None,
        oem_base_url: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
    ) -> AskOpsResult:
        """
        ask() 为兼容入口（兼容老的 ask_ops tool 调用习惯）。

        新版流程（请关注这里）：
        1) 先按用户问题选择 Skill（skill-first）；
        2) 若命中 Skill，按 Skill workflow 执行（其中可调用 fetch_data）；
        3) 若未命中 Skill，再走兼容数据流：fetch_data -> 兼容输出。
        """
        # Step-1: 先按问题选择 Skill（符合 skill-first 设计目标）。
        skill_name = self.select_skill_by_question(question)
        if skill_name:
            return self.execute_skill_workflow(
                skill_name=skill_name,
                question=question,
                session_id=session_id,
                oem_base_url=oem_base_url,
                username=username,
                password=password,
            )

        # Step-2: 未命中 Skill 的兼容路径（保留旧行为，确保平滑迁移）。
        fetched = self.fetch_data(
            question=question,
            session_id=session_id,
            oem_base_url=oem_base_url,
            username=username,
            password=password,
        )
        if fetched.need_follow_up:
            return AskOpsResult(
                session_id=fetched.session_id,
                need_follow_up=True,
                follow_up_question=fetched.follow_up_question,
                final_result=None,
            )

        final_result = (
            f"已完成查询。目标: {fetched.target_name}，监控项: {(fetched.metric_keys[0] if fetched.metric_keys else 'unknown_metric')}，"
            f"时间范围: {fetched.time_range}。获取到 latestData {len(fetched.latest_data)} 条，"
            f"timeSeries {len(fetched.metric_time_series)} 条，incidents {len(fetched.incidents)} 条，events {len(fetched.events)} 条。"
        )

        # 单文档知识库仍参与流程，但仅用于补充最终一句建议，不输出中间细节。
        try:
            kb = SingleDocKnowledgeBase(kb_path)
            kb_keywords = [fetched.intent_type or "", *(fetched.metric_keys or [])]
            if fetched.target_name:
                kb_keywords.append(fetched.target_name)
            snippets = kb.search(kb_keywords, top_k=1)
            if snippets:
                final_result += f" 建议参考知识库: {snippets[0].source}。"
        except Exception:
            pass

        return AskOpsResult(
            session_id=fetched.session_id,
            need_follow_up=False,
            follow_up_question=None,
            final_result=final_result,
        )

    @staticmethod
    def select_skill_by_question(question: str) -> str | None:
        """
        Skill 预选择（skill-first）：
        - 先基于用户问题选择候选 Skill；
        - 由 Skill workflow 再决定是否继续执行/追问/回退。
        """
        if is_alert_related_question(question) and any(k in question.lower() for k in ["cpu", "处理器", "负载"]):
            return "cpu_alert_mvp"
        return None

    def _select_skill_for_fetch_result(self, fetched: FetchDataResult) -> str | None:
        """
        Skill 选择策略（MVP）：
        - 当场景路由命中 cpu_high 时，返回 cpu_alert_mvp；
        - 其余场景暂不命中 Skill，走兼容输出。
        """
        if fetched.scenario == "cpu_high":
            return "cpu_alert_mvp"
        return None

    def execute_skill_workflow(
        self,
        skill_name: str,
        question: str,
        session_id: Optional[str],
        oem_base_url: Optional[str],
        username: Optional[str],
        password: Optional[str],
    ) -> AskOpsResult:
        """
        执行 Skill workflow（MVP 版本）。

        当前 cpu_alert_mvp 的 workflow 为：
        1) 调用 fetch_data() 获取结构化数据；
        2) 若需要追问则直接返回；
        3) 若场景命中 cpu_high，调用 run_skill() 输出；
        4) 否则回退到兼容提示，避免误用 Skill。
        """
        fetched = self.fetch_data(
            question=question,
            session_id=session_id,
            oem_base_url=oem_base_url,
            username=username,
            password=password,
        )
        if fetched.need_follow_up:
            return AskOpsResult(
                session_id=fetched.session_id,
                need_follow_up=True,
                follow_up_question=fetched.follow_up_question,
                final_result=None,
            )

        resolved_skill = self._select_skill_for_fetch_result(fetched)
        if resolved_skill != skill_name:
            return AskOpsResult(
                session_id=fetched.session_id,
                need_follow_up=False,
                follow_up_question=None,
                final_result=(
                    f"已匹配 Skill={skill_name}，但数据路由场景为 {fetched.scenario}，"
                    "当前未命中该 Skill 的执行条件，请改用更具体的 CPU 告警问题。"
                ),
            )

        return AskOpsResult(
            session_id=fetched.session_id,
            need_follow_up=False,
            follow_up_question=None,
            final_result=self.run_skill(skill_name=skill_name, fetched=fetched),
        )

    @staticmethod
    def run_skill(skill_name: str, fetched: FetchDataResult) -> str:
        """
        Skill 调用分发器。

        设计目的：
        - 将“从 OEM fetch data 后如何调用 Skill”集中到一个函数中，避免散落在 ask() 中。
        - 便于后续按 skill_name 扩展更多场景（如 io_alert_mvp、巡检类 skill）。

        当前实现：
        - cpu_alert_mvp -> render_cpu_alert_skill(fetched)
        """
        if skill_name == "cpu_alert_mvp":
            return render_cpu_alert_skill(fetched)
        raise ValueError(f"未支持的 skill: {skill_name}")

    def fetch_data(
        self,
        question: str,
        session_id: Optional[str] = None,
        oem_base_url: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
    ) -> FetchDataResult:
        """
        数据层统一入口（供 `fetch_data_from_oem` tool 与 `ask()` 复用）。

        该函数只做三件事：
        A. 问题识别（intent/target/time_range）
        B. 场景路由（cpu_high/io_high/...）
        C. OEM 取数（latestData/timeSeries/incidents/events）

        不做最终 Skill 文案渲染；Skill 渲染由 ask() -> run_skill() 触发。
        """
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
        incidents = bundle.incidents
        events = bundle.events
        if scenario:
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
            events = self._oem_client.list_events_by_incidents(
                session=session,
                endpoints=self._config.endpoints,
                incidents=incidents,
            )

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
        )

    def _ask_alert(
        self,
        question: str,
        session_id: Optional[str],
        oem_base_url: Optional[str],
        username: Optional[str],
        password: Optional[str],
    ) -> AskOpsResult:
        # _ask_alert() = 告警处理编排主流程（面向“当前有哪些告警，如何处理”）
        #
        # 输入：
        # - question: 用户自然语言问题
        # - session_id 或认证参数: 用于 OEM REST 只读访问
        #
        # 输出：
        # - AskOpsResult.final_result: 包含场景识别 + 证据来源 + SOP 建议
        #
        # 子步骤：
        # A. 会话解析：复用已有登录态（或按参数新建会话）
        # B. 意图解析：提取 target_name / target_type（若问题中有对象）
        # C. 场景识别：rule-first, LLM-fallback（由 alert_router 实现）
        # D. 规则校验：若场景要求 target 但未提供，则返回追问
        # E. 数据采集：仅采 incidents + events（OEM 主路径）
        # F. SOP 生成：调用 sop_engine 输出场景化处置建议
        session = self._resolve_session(
            session_id=session_id,
            oem_base_url=oem_base_url,
            username=username,
            password=password,
        )
        parsed = parse_intent(question, self._config.intent_metric_map)
        route = classify_alert_scenario(
            question=question,
            alert_scenarios=self._config.alert_scenarios,
            llm=self._llm_classifier,
        )
        route_cfg = self._config.alert_scenarios.get(route.scenario, {})
        if route_cfg.get("require_target") and not parsed.target_name:
            return AskOpsResult(
                session_id=session.session_id,
                need_follow_up=True,
                follow_up_question="该告警场景需要目标名称，请补充主机名（例如：host01）。",
                final_result=None,
            )

        incidents = self._oem_client.list_recent_incidents(
            session=session,
            endpoints=self._config.endpoints,
            target_name=parsed.target_name,
            target_type_name=parsed.target_type_name if parsed.target_name else None,
            scenario=route.scenario,
            question=question,
            age_hours=24,
            limit=50,
        )
        events = self._oem_client.list_events_by_incidents(
            session=session,
            endpoints=self._config.endpoints,
            incidents=incidents,
        )

        # 统一返回格式（供前端/插件稳定渲染）：
        # - 第一行：场景识别结果（可审计）
        # - 第二行：数据来源说明（避免“模型臆断”）
        # - 其后：SOP建议正文（固定步骤）
        final_result = (
            f"告警识别结果: {route.scenario} (classifier={route.classifier}, confidence={route.confidence:.2f})\n"
            "数据来源: OEM incidents/events（主）\n"
            + build_sop_recommendation(
                scenario=route.scenario,
                target_name=parsed.target_name,
                incidents=incidents,
                events=events,
                metric_bundle=None,
            )
        )
        return AskOpsResult(
            session_id=session.session_id,
            need_follow_up=False,
            follow_up_question=None,
            final_result=final_result,
        )

    # 没有用到 self，也不访问类属性，只依赖传入参数，因此适合作为静态方法（@staticmethod）。
    @staticmethod
    def _merge_route_target_type(route_config: dict[str, Any], target_type_name: str) -> dict[str, Any]:
        """
        合并路由配置与目标类型名。

        输入:
          - route_config: 路由配置字典
          - target_type_name: 目标类型名称（字符串）

        处理步骤:
          - 拷贝一份 route_config
          - 写入/覆盖 "target_type_name" 字段

        输出: 合并后的新字典
        """
        merged = dict(route_config)
        merged["target_type_name"] = target_type_name
        return merged

    # 没有用到 self，也不访问类属性，只依赖传入参数，因此适合作为静态方法（@staticmethod）。
    @staticmethod
    def _format_table(rows: list[dict[str, str]], headers: list[str]) -> str:
        """
        遍历 rows 与 headers 生成纯文本表格。

        输入:
          - rows: 多行字典，每行一个数据
          - headers: 列名列表

        处理步骤:
          - 计算每列显示宽度
          - 输出标题、分隔线及每行内容

        输出: 格式化文本表格（字符串）；如 rows 为空返回"未查询到数据。"
        """
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

        # 兼容场景：客户端未透传 session_id，但当前进程缓存里已有可复用会话。
        latest_session = self._sessions.get_latest()
        if latest_session:
            return latest_session

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
