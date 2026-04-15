"""oracle_health_check 模块：关键词、分钟数、目标解析与 SQL 构造（无数据库）。"""
from __future__ import annotations

from src.oracle_health_check import (
    ORACLE_HEALTH_CHECK_SKILL_NAME,
    build_health_check_sections,
    extract_health_check_targets,
    is_health_check_question,
    parse_health_check_minutes,
    wants_lock_metrics,
)


def test_skill_name_constant() -> None:
    assert ORACLE_HEALTH_CHECK_SKILL_NAME == "oracle-db-quick-health"


def test_is_health_check_question() -> None:
    assert is_health_check_question("对 omrd 做健康检查") is True
    assert is_health_check_question("quick health for db01") is True
    assert is_health_check_question("列出所有主机") is False


def test_parse_health_check_minutes() -> None:
    assert parse_health_check_minutes("最近 15 分钟") == 15
    assert parse_health_check_minutes("2 小时") == 120
    assert parse_health_check_minutes("半小时") == 30
    assert parse_health_check_minutes("无时间") == 30
    assert parse_health_check_minutes("99999 分钟") == 1440
    assert parse_health_check_minutes("last 24 hours") == 1440
    assert parse_health_check_minutes("past 2 hours") == 120
    assert parse_health_check_minutes("昨天 omrd 健康检查") == 1440
    assert parse_health_check_minutes("最近健康检查", "24h") == 1440
    assert parse_health_check_minutes("健康检查", "24h") == 30
    assert parse_health_check_minutes("两小时巡检") == 120


def test_extract_targets() -> None:
    assert extract_health_check_targets("检查 host01, db02 健康") == ["host01", "db02"]
    assert extract_health_check_targets("omrd 健康检查") == ["omrd"]


def test_wants_lock_metrics() -> None:
    assert wants_lock_metrics("阻塞与锁") is True
    assert wants_lock_metrics("CPU 高") is False


def test_build_sections_count() -> None:
    secs = build_health_check_sections(["t1"], 30, include_lock=False)
    assert len(secs) == 5
    secs2 = build_health_check_sections(["a", "b"], 60, include_lock=True)
    assert len(secs2) == 6
    assert ":t0" in secs2[0].sql and ":t1" in secs2[0].sql
    assert secs2[0].binds["mins"] == 60


def test_build_sections_empty_targets() -> None:
    assert build_health_check_sections([], 30, False) == []
