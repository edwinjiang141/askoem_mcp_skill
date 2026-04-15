"""sql_trace：追踪用 SQL 字面量替换。"""
from __future__ import annotations

from src.sql_trace import format_sql_for_trace


def test_format_sql_for_trace_mins_and_targets() -> None:
    sql = "WHERE x >= NUMTODSINTERVAL(:mins, 'MINUTE') AND LOWER(TRIM(a)) = LOWER(TRIM(:t0))"
    out = format_sql_for_trace(sql, {"mins": 30, "t0": "myDB01"})
    assert ":mins" not in out
    assert ":t0" not in out
    assert "30" in out
    assert "'myDB01'" in out


def test_format_sql_for_trace_two_targets() -> None:
    sql = "AND (:t0 OR :t1)"
    out = format_sql_for_trace(sql, {"t0": "a", "t1": "b"})
    assert "'a'" in out and "'b'" in out
