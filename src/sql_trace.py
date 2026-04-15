"""
仅用于工具执行追踪（report / trace）展示：将命名绑定 :name 替换为字面量，便于阅读。
不用于再次执行 SQL；生产执行仍使用参数绑定。
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional


def _literal_for_trace(val: Any) -> str:
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, Decimal):
        return format(val, "f")
    if isinstance(val, (datetime, date)):
        return f"TIMESTAMP '{val.isoformat()}'"
    s = str(val).replace("'", "''")
    return f"'{s}'"


def format_sql_for_trace(sql: str, binds: Optional[dict[str, Any]] = None) -> str:
    """
    将 SQL 中 :bind_name 按 binds 字典替换为字面量；键名按长度降序，避免 :t1 误伤 :t10 的前缀。
    """
    if not binds:
        return sql
    out = sql
    for key in sorted(binds.keys(), key=lambda k: len(str(k)), reverse=True):
        ph = ":" + str(key)
        if ph not in out:
            continue
        out = out.replace(ph, _literal_for_trace(binds[key]))
    return out
