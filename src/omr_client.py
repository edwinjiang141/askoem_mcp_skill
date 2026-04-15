from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Optional

from src.oem_client import OemDataBundle

try:
    import oracledb  # type: ignore
except Exception:  # pragma: no cover
    oracledb = None


@dataclass
class OmrConfig:
    username: str
    password: str
    dsn: str
    schema: str = "SYSMAN"
    # None 表示不在 SQL 中加 FETCH FIRST（由调用方问题中的条数或 NL2SQL 决定）
    fetch_limit: Optional[int] = None


class OmrClient:
    """Oracle OMR 只读查询客户端（MVP）。"""

    def __init__(self, config: OmrConfig):
        self._config = config

    def _connect(self):
        if oracledb is None:
            raise RuntimeError("未安装 oracledb，无法连接 OMR。请先安装依赖。")
        return oracledb.connect(user=self._config.username, password=self._config.password, dsn=self._config.dsn)

    def _query(self, sql: str, binds: Optional[dict[str, Any]] = None) -> list[dict[str, Any]]:
        binds = binds or {}
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, binds)
                columns = [str(d[0]).lower() for d in (cur.description or [])]
                rows: list[dict[str, Any]] = []
                for r in cur.fetchall():
                    row = {columns[i]: self._normalize_value(r[i]) for i in range(len(columns))}
                    rows.append(row)
                return rows

    @staticmethod
    def _normalize_value(value: Any) -> Any:
        if isinstance(value, (bytes, bytearray, memoryview)):
            raw = bytes(value)
            return raw.hex()
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, Decimal):
            return float(value)
        return value

    def execute_sql(self, sql: str, binds: Optional[dict[str, Any]] = None) -> list[dict[str, Any]]:
        return self._query(sql, binds)

    @staticmethod
    def _start_time(time_range: str) -> datetime:
        end = datetime.now(timezone.utc)
        if time_range == "1h":
            return end - timedelta(hours=1)
        if time_range == "7d":
            return end - timedelta(days=7)
        return end - timedelta(hours=24)

    def list_targets(self, target_name: str | None = None, target_type: str | None = None, limit: Optional[int] = None) -> list[dict[str, Any]]:
        sql = (
            "SELECT target_name, target_type, target_guid, display_name, host_name, "
            "last_metric_load_time, last_load_time_utc "
            "FROM mgmt$target WHERE 1=1 "
        )
        binds: dict[str, Any] = {}
        if target_name:
            sql += " AND LOWER(target_name) LIKE LOWER(:target_name)"
            binds["target_name"] = f"%{target_name}%"
        if target_type:
            sql += " AND LOWER(target_type) = LOWER(:target_type)"
            binds["target_type"] = target_type
        sql += " ORDER BY last_load_time_utc DESC NULLS LAST"
        if limit is not None:
            cap = limit
            if self._config.fetch_limit is not None:
                cap = max(1, min(limit, self._config.fetch_limit))
            binds["limit_n"] = cap
            sql += " FETCH FIRST :limit_n ROWS ONLY"
        return self._query(sql, binds)

    def list_metric_groups(self, target_name: str, target_type: str = "host", limit: Optional[int] = None) -> list[dict[str, Any]]:
        sql = (
            "SELECT DISTINCT metric_name, metric_column, metric_label, column_label "
            "FROM sysman.mgmt$metric_current "
            "WHERE LOWER(target_name)=LOWER(:target_name) AND LOWER(target_type)=LOWER(:target_type) "
        )
        binds: dict[str, Any] = {
            "target_name": target_name,
            "target_type": target_type,
        }
        if limit is not None:
            cap = limit
            if self._config.fetch_limit is not None:
                cap = max(1, min(limit, self._config.fetch_limit))
            binds["limit_n"] = cap
            sql += " FETCH FIRST :limit_n ROWS ONLY"
        rows = self._query(sql, binds)
        return [{"metricGroupName": x.get("metric_name") or "-", "metricColumn": x.get("metric_column") or ""} for x in rows]

    def list_recent_incidents(
        self,
        target_name: str | None = None,
        target_type_name: str | None = None,
        age_hours: int = 24,
        limit: Optional[int] = None,
    ) -> list[dict[str, Any]]:
        start_time = datetime.now(timezone.utc) - timedelta(hours=max(1, age_hours))
        sql = (
            "SELECT incident_id, incident_num, summary_msg, severity, priority, owner, "
            "creation_date, last_updated_date, event_count, open_status, closed_date, target_guid "
            "FROM mgmt$incidents "
            "WHERE (open_status = 1 OR closed_date >= :start_time)"
        )
        binds: dict[str, Any] = {
            "start_time": start_time,
        }
        if limit is not None:
            cap = limit
            if self._config.fetch_limit is not None:
                cap = max(1, min(limit, self._config.fetch_limit))
            binds["limit_n"] = cap
        if target_name:
            sql += " AND LOWER(summary_msg) LIKE LOWER(:target_name_like)"
            binds["target_name_like"] = f"%{target_name}%"
        sql += " ORDER BY last_updated_date DESC NULLS LAST"
        if limit is not None:
            sql += " FETCH FIRST :limit_n ROWS ONLY"
        rows = self._query(sql, binds)
        for x in rows:
            x.setdefault("source", "omr_db")
        return rows

    def fetch_bundle(self, target_name: str | None, route_config: dict[str, Any], time_range: str) -> OemDataBundle:
        if not target_name:
            return OemDataBundle(target={}, latest_data=[], metric_time_series=[], incidents=[], events=[])

        target_type = route_config.get("target_type_name", "host")
        metric_name = route_config.get("metric_group_name")
        metric_column = route_config.get("metric_name")
        start_time = self._start_time(time_range)

        targets = self.list_targets(target_name=target_name, target_type=target_type, limit=1)
        target = targets[0] if targets else {}

        latest_data: list[dict[str, Any]] = []
        if metric_name and metric_column:
            sql = (
                "SELECT target_name, target_type, metric_name, metric_column, collection_timestamp, value "
                "FROM sysman.mgmt$metric_current "
                "WHERE LOWER(target_name)=LOWER(:target_name) "
                "AND LOWER(target_type)=LOWER(:target_type) "
                "AND metric_name=:metric_name "
                "AND metric_column=:metric_column "
                "ORDER BY collection_timestamp DESC"
            )
            latest_data = self._query(sql, {
                "target_name": target_name,
                "target_type": target_type,
                "metric_name": metric_name,
                "metric_column": metric_column,
            })

        metric_time_series = [
            x for x in latest_data
            if x.get("collection_timestamp") and x["collection_timestamp"] >= start_time
        ]

        incidents = self.list_recent_incidents(target_name=target_name, target_type_name=target_type, age_hours=24, limit=None)
        return OemDataBundle(
            target=target,
            latest_data=latest_data,
            metric_time_series=metric_time_series,
            incidents=incidents,
            events=[],
        )
