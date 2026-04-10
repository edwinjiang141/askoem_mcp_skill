from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Any, Optional

from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

load_dotenv()


@dataclass
class SqlPlan:
    sql: str
    source: str  # template | llm


class OemNl2SqlEngine:
    """MVP: 模板优先，LLM 兜底（中英文）。"""

    ALLOWED_VIEWS = {
        "mgmt$target",
        "mgmt$incidents",
        "sysman.mgmt$metric_current",
    }

    def __init__(self) -> None:
        api_key = (os.getenv("DEEPSEEK_API_KEY") or "").strip()
        base_url = (os.getenv("DEEPSEEK_BASE_URL") or "https://api.deepseek.com").strip()
        model = (os.getenv("DEEPSEEK_MODEL") or "deepseek-chat").strip()

        self._llm: Optional[ChatOpenAI] = None
        if api_key:
            try:
                self._llm = ChatOpenAI(api_key=api_key, base_url=base_url, model=model, temperature=0.0)
            except Exception:
                self._llm = None

        if self._llm:
            self._chain = (
                ChatPromptTemplate.from_messages([
                    (
                        "system",
                        (
                            "你是 Oracle OMR 的 NL2SQL 生成器，支持中文和英文。"
                            "只能使用以下视图: MGMT$TARGET, MGMT$INCIDENTS, SYSMAN.MGMT$METRIC_CURRENT。"
                            "只输出 JSON: {\"sql\":\"...\"}。"
                            "SQL 只能是单条 SELECT，不允许 DDL/DML，不允许分号。"
                            "请尽量加过滤和行数限制。"
                        ),
                    ),
                    ("human", "问题: {question}"),
                ])
                | self._llm
                | StrOutputParser()
            )

    @staticmethod
    def _template_sql(question: str) -> Optional[str]:
        q = question.lower()
        if any(k in q for k in ["列出", "list", "目标", "targets"]) and any(k in q for k in ["主机", "host", "database", "数据库"]):
            return (
                "SELECT target_name, target_type, display_name, host_name, last_load_time_utc "
                "FROM mgmt$target ORDER BY last_load_time_utc DESC NULLS LAST FETCH FIRST 200 ROWS ONLY"
            )

        if any(k in q for k in ["告警", "incident", "事件"]) and any(k in q for k in ["未关闭", "open", "当前", "current"]):
            return (
                "SELECT incident_num, summary_msg, severity, priority, owner, open_status, last_updated_date "
                "FROM mgmt$incidents WHERE open_status = 1 "
                "ORDER BY last_updated_date DESC NULLS LAST FETCH FIRST 100 ROWS ONLY"
            )

        if any(k in q for k in ["cpu", "利用率", "metric", "指标", "当前值", "current"]):
            target_match = re.search(r"([A-Za-z0-9._-]{2,})", question)
            target_name = target_match.group(1) if target_match else None
            if target_name:
                return (
                    "SELECT target_name, target_type, metric_name, metric_column, collection_timestamp, value "
                    "FROM sysman.mgmt$metric_current "
                    f"WHERE target_name = '{target_name}' "
                    "ORDER BY collection_timestamp DESC FETCH FIRST 100 ROWS ONLY"
                )
        return None

    @classmethod
    def _is_safe_sql(cls, sql: str) -> bool:
        s = sql.strip().lower()
        if not s.startswith("select"):
            return False
        if ";" in s:
            return False
        for bad in [" insert ", " update ", " delete ", " merge ", " drop ", " alter ", " truncate ", " create "]:
            if bad in f" {s} ":
                return False
        if not any(v in s for v in cls.ALLOWED_VIEWS):
            return False
        return True

    def generate(self, question: str) -> Optional[SqlPlan]:
        template = self._template_sql(question)
        if template and self._is_safe_sql(template):
            return SqlPlan(sql=template, source="template")

        if not self._llm:
            return None

        try:
            raw = self._chain.invoke({"question": question}).strip()
            data = json.loads(raw)
            sql = str(data.get("sql", "")).strip()
            if self._is_safe_sql(sql):
                return SqlPlan(sql=sql, source="llm")
        except Exception:
            return None
        return None
