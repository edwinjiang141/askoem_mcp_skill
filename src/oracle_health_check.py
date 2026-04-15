"""
Oracle 数据库快速健康检查：关键词识别 + 参数化 MGMT$METRIC_DETAILS 分块查询（仅 OMR 白名单视图）。
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Optional

from src.sql_trace import format_sql_for_trace

# 与 skills/oracle_health_check_mvp/SKILL.md frontmatter name 一致
ORACLE_HEALTH_CHECK_SKILL_NAME = "oracle-db-quick-health"

_HEALTH_PATTERNS = re.compile(
    r"(健康检查|快速检查|快速健康|健康巡检|巡检|health\s*check|quick\s*health)",
    re.IGNORECASE,
)
_LOCK_PATTERNS = re.compile(
    r"(锁|阻塞|enqueue|死锁|blocked|blocking)",
    re.IGNORECASE,
)
_TARGET_SPLIT = re.compile(r"[,，、]|(?:\s+和\s+)|(?:\s+与\s+)")


def is_health_check_question(question: str) -> bool:
    q = (question or "").strip()
    if not q:
        return False
    return bool(_HEALTH_PATTERNS.search(q))


def wants_lock_metrics(question: str) -> bool:
    return bool(_LOCK_PATTERNS.search(question or ""))


def _clamp_minutes(m: int) -> int:
    return max(5, min(1440, int(m)))


def _minutes_from_intent_time_range(hint: str | None) -> int | None:
    """与 intent_parser._parse_time_range 产物对齐：1h / 24h / 7d。"""
    if not hint:
        return None
    h = str(hint).strip().lower()
    if h == "1h":
        return 60
    if h == "24h":
        return 1440
    if h == "7d":
        return 1440
    return None


def parse_health_check_minutes(question: str, time_range_hint: str | None = None) -> int:
    """
    解析巡检时间窗（分钟）。优先从问句抽取；无法抽取时用 intent 的 time_range；再默认 30。
    clamp 5～1440。
    """
    q = (question or "").strip()

    # --- 英文：30 minutes / last 2 hours / 24 hours / 1 day ---
    m = re.search(r"(?i)(\d+)\s*(minutes?|mins?)\b", q)
    if m:
        return _clamp_minutes(int(m.group(1)))
    m = re.search(r"(?i)(\d+)\s*(hours?|hrs?)\b", q)
    if m:
        return _clamp_minutes(int(m.group(1)) * 60)
    m = re.search(r"(?i)(\d+)\s*(hr|h)\b", q)
    if m:
        return _clamp_minutes(int(m.group(1)) * 60)
    m = re.search(r"(?i)(\d+)\s*(days?|day)\b", q)
    if m:
        return _clamp_minutes(int(m.group(1)) * 24 * 60)

    # --- 中文：数字 + 分钟/小时/天 ---
    m = re.search(r"(\d+)\s*分钟", q)
    if m:
        return _clamp_minutes(int(m.group(1)))
    m = re.search(r"(\d+)\s*(小时|钟头|个小时)", q)
    if m:
        return _clamp_minutes(int(m.group(1)) * 60)
    m = re.search(r"(\d+)\s*(天|日)(?![历然])", q)
    if m:
        return _clamp_minutes(int(m.group(1)) * 24 * 60)

    # --- 口语：半小时、一两小时、两三个小时 ---
    if "半小时" in q or "半个钟头" in q:
        return 30
    if re.search(r"(一|1)\s*小时", q) or "一小时" in q or "一个小时" in q:
        return 60
    if re.search(r"(两|俩|二)\s*小时", q) or "两小时" in q:
        return 120
    if re.search(r"(三|3)\s*小时", q) or "三小时" in q:
        return 180
    if re.search(r"(四|4)\s*小时", q):
        return 240
    if re.search(r"(两|俩|二)\s*分钟", q):
        return _clamp_minutes(2)

    # --- 一天 / 昨天 / 最近一天 / 本周（按天粒度，受 clamp）---
    if any(
        x in q
        for x in (
            "一天",
            "一整天",
            "24小时",
            "二十四小时",
            "昨天",
            "昨日",
            "最近一天",
            "今日整天",
            "今天整天",
        )
    ):
        return 1440
    if any(x in q for x in ("一周", "七天", "7天", "这周", "过去一周", "最近一周", "最近7天")):
        return 1440

    # --- 模糊时间词且无上面命中：用 intent 的 time_range（避免无时间句默认成 24h）---
    if re.search(r"(最近|近来|这几天|这段时间|昨夜|昨日|昨天|过去)", q):
        hinted = _minutes_from_intent_time_range(time_range_hint)
        if hinted is not None:
            return hinted

    return 30


def _sanitize_target_token(raw: str) -> Optional[str]:
    t = raw.strip().strip("'\"").strip()
    if not t or len(t) > 128:
        return None
    if not re.match(r"^[A-Za-z0-9._-]+$", t):
        return None
    return t


def extract_health_check_targets(question: str) -> list[str]:
    """提取 1～5 个监控目标名（字母数字点下划线短横线）。"""
    seen: set[str] = set()
    out: list[str] = []
    # 先按分隔符拆段，每段取第一个合法 token；否则整句扫描
    parts = _TARGET_SPLIT.split(question)
    if len(parts) > 1:
        for p in parts:
            for tok in re.findall(r"[A-Za-z0-9][A-Za-z0-9._-]{1,127}", p):
                st = _sanitize_target_token(tok)
                if st and st.lower() not in seen:
                    seen.add(st.lower())
                    out.append(st)
                    if len(out) >= 5:
                        return out
        if out:
            return out
    for tok in re.findall(r"[A-Za-z0-9][A-Za-z0-9._-]{1,127}", question):
        st = _sanitize_target_token(tok)
        if not st:
            continue
        low = st.lower()
        if low in {"cpu", "host", "hosts", "database", "instance", "db", "metric", "metrics", "min", "hour"}:
            continue
        if low not in seen:
            seen.add(low)
            out.append(st)
            if len(out) >= 5:
                break
    return out


@dataclass
class HealthCheckSection:
    key: str
    label_zh: str
    sql: str
    binds: dict[str, Any]


def _targets_predicate(num_targets: int) -> str:
    if num_targets == 1:
        return "LOWER(TRIM(target_name)) = LOWER(TRIM(:t0))"
    parts = [f"LOWER(TRIM(target_name)) = LOWER(TRIM(:t{i}))" for i in range(num_targets)]
    inner = " OR ".join(parts)
    return f"({inner})"


def build_health_check_sections(
    targets: list[str],
    minutes: int,
    include_lock: bool,
) -> list[HealthCheckSection]:
    """
    构造 5～6 段 SQL（SYSMAN.MGMT$METRIC_DETAILS），仅使用白名单视图。
    binds 中 t0,t1,... 由调用方填入；minutes 为整数分钟。
    """
    mins = max(5, min(1440, int(minutes)))
    n = len(targets)
    if n < 1 or n > 5:
        return []

    tw = _targets_predicate(n)
    base_binds: dict[str, Any] = {"mins": mins, **{f"t{i}": targets[i] for i in range(n)}}

    time_pred = "collection_timestamp >= SYSTIMESTAMP - NUMTODSINTERVAL(:mins, 'MINUTE')"

    def _wrap(where_metric: str, key: str, label: str) -> HealthCheckSection:
        sql = (
            f"SELECT target_name, target_type, metric_name, metric_column, "
            f"column_label, value, collection_timestamp "
            f"FROM sysman.mgmt$metric_details "
            f"WHERE {time_pred} AND {tw} AND ({where_metric})"
        )
        return HealthCheckSection(key=key, label_zh=label, sql=sql, binds=dict(base_binds))

    sections: list[HealthCheckSection] = [
        _wrap(
            "("
            "LOWER(metric_name) LIKE '%load%' OR LOWER(metric_column) LIKE '%cpu%' "
            "OR LOWER(column_label) LIKE '%cpu%' OR LOWER(metric_name) LIKE '%cpu%'"
            ")",
            "cpu",
            "CPU",
        ),
        _wrap(
            "("
            "LOWER(metric_name) LIKE '%memory%' OR LOWER(column_label) LIKE '%memory%' "
            "OR LOWER(column_label) LIKE '%sga%' OR LOWER(column_label) LIKE '%pga%' "
            "OR LOWER(metric_name) LIKE '%memory%'"
            ")",
            "memory",
            "内存",
        ),
        _wrap(
            "("
            "LOWER(metric_name) LIKE '%io%' OR LOWER(column_label) LIKE '%physical read%' "
            "OR LOWER(column_label) LIKE '%physical write%' OR LOWER(column_label) LIKE '%i/o%'"
            ")",
            "io",
            "IO",
        ),
        _wrap(
            "("
            "LOWER(column_label) LIKE '%wait%' OR LOWER(metric_name) LIKE '%wait%' "
            "OR LOWER(metric_column) LIKE '%wait%'"
            ")",
            "wait",
            "等待",
        ),
        _wrap(
            "("
            "LOWER(metric_name) LIKE '%session%' OR LOWER(column_label) LIKE '%session%' "
            "OR LOWER(column_label) LIKE '%并发%'"
            ")",
            "session",
            "会话",
        ),
    ]
    if include_lock:
        sections.append(
            _wrap(
                "("
                "LOWER(metric_name) LIKE '%enqueue%' OR LOWER(metric_column) LIKE '%enqueue%' "
                "OR LOWER(column_label) LIKE '%enqueue%' OR LOWER(metric_name) LIKE '%mtx%' "
                "OR LOWER(metric_name) LIKE '%lock%' OR LOWER(metric_column) LIKE '%lock%' "
                "OR LOWER(column_label) LIKE '%deadlock%' OR LOWER(column_label) LIKE '%blocked%' "
                "OR LOWER(column_label) LIKE '%blocking%'"
                ")",
                "lock",
                "锁/Enqueue",
            )
        )
    return sections


def execute_health_check_bundle(
    omr_client: Any,
    targets: list[str],
    minutes: int,
    include_lock: bool,
) -> list[dict[str, Any]]:
    """执行各段 SQL，返回 omr_sub_queries 风格的子结果列表。"""
    sections = build_health_check_sections(targets, minutes, include_lock)
    sub_results: list[dict[str, Any]] = []
    for sec in sections:
        binds = dict(sec.binds)
        rows = omr_client.execute_sql(sec.sql, binds)
        for r in rows:
            r["_health_section"] = sec.key
        sub_results.append(
            {
                "sub_question": f"{sec.label_zh}（{sec.key}）",
                "generated_sql": sec.sql,
                "generated_sql_resolved": format_sql_for_trace(sec.sql, binds),
                "sql_source": "health_check_template",
                "latest_data": rows,
                "metric_time_series": [],
            }
        )
    return sub_results
