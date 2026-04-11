from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from typing import Optional

from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

load_dotenv()


@dataclass
class SqlPlan:
    sql: str
    source: str  # template | llm


@dataclass
class SqlRejection:
    """LLM 生成了 SQL 但被安全检查拒绝时的诊断信息。"""
    sql: str
    reason: str


# OMR 可查询视图白名单（全小写，匹配时统一转小写）
ALLOWED_VIEWS = {
    "mgmt$target",
    "mgmt$incidents",
    "sysman.mgmt$metric_current",
    "sysman.mgmt$metric_details",
    "mgmt$alert_current",
    "sysman.mgmt$availability_current",
    "mgmt$target_properties",
    "mgmt$metric_current",
}

# 视图 schema 描述，注入 LLM prompt，让 LLM 知道每个视图能查什么
VIEW_SCHEMA_DESCRIPTION = """
可用视图及其主要列:

1. MGMT$TARGET — 监控目标清单
   列: TARGET_NAME, TARGET_TYPE, DISPLAY_NAME, HOST_NAME, LAST_LOAD_TIME_UTC, TYPE_DISPLAY_NAME

2. MGMT$INCIDENTS — 告警/事件（注意：此视图无 TARGET_NAME、无 TARGET_TYPE，仅有 TARGET_GUID 关联目标）
   列: INCIDENT_ID, INCIDENT_NUM, SUMMARY_MSG, SEVERITY, PRIORITY, OWNER, CREATION_DATE, LAST_UPDATED_DATE,
       EVENT_COUNT, OPEN_STATUS(1=未关闭), CLOSED_DATE, TARGET_GUID
   需要目标名或目标类型时：JOIN MGMT$TARGET T ON MGMT$INCIDENTS.TARGET_GUID = T.TARGET_GUID，再用 T.TARGET_NAME / T.TARGET_TYPE 过滤

3. SYSMAN.MGMT$METRIC_CURRENT — 当前指标值（最近一次采集）
   列: TARGET_NAME, TARGET_TYPE, METRIC_NAME, METRIC_COLUMN, METRIC_LABEL, COLUMN_LABEL, VALUE, COLLECTION_TIMESTAMP, KEY_VALUE,VALUE
   常见 METRIC_NAME 示例: load(CPU), Filesystems(磁盘), Response(响应时间), Session(会话), Memory(内存)

4. SYSMAN.MGMT$METRIC_DETAILS — 指标定义
   列: TARGET_TYPE, METRIC_NAME, METRIC_COLUMN, METRIC_LABEL, COLUMN_LABEL, DESCRIPTION，COLLECTION_TIMESTAMP,KEY_VALUE,VALUE

5. MGMT$ALERT_CURRENT — 当前活跃告警
   列: TARGET_NAME, TARGET_TYPE, METRIC_NAME, METRIC_COLUMN, KEY_VALUE, ALERT_STATE, MESSAGE, COLLECTION_TIMESTAMP

6. SYSMAN.MGMT$AVAILABILITY_CURRENT — 可用性状态
   列: TARGET_NAME, TARGET_TYPE, AVAILABILITY_STATUS, START_COLLECTION_TIMESTAMP

7. COLUMN_LABEL 有如下类型：
Active State
Archiver
Database Status
Audited User Session Count
State
Status
Free Archive Area (KB)
Total Archive Area (KB)
Archive Area Used (KB)
Archive Area Used (%)
Average Wait Time (millisecond)
Average Foreground Wait Time (millisecond)
Average Active Sessions
Average Synchronous Single-Block Read Latency (ms)
Average Instance CPU (%)
Average Users Waiting Count
BG Checkpoints (per second)
Branch Node Splits (per second)
Branch Node Splits (per transaction)
Buffer Cache Hit (%)
Buffer Cache(MB)
Tablespace Free Space (MB) (Undo)
Tablespace Free Space (MB) (Undo)
Tablespace Free Space (MB) (Undo)
User Commits (per second)
User Commits (per transaction)
Consistent Read Changes (per second)
Consistent Read Changes (per transaction)
Consistent Read Gets (per second)
Consistent Read Gets (per transaction)
containerName
Database CPU Time (%)
CPU Usage (per second)
CPU Usage (per transaction)
Consistent Read Blocks Created (per second)
Consistent Read Blocks Created (per transaction)
Consistent Read Undo Records Applied (per second)
Consistent Read Undo Records Applied (per transaction)
Cursor Cache Hit (%)
dbDomain
Database Block Changes (per second)
Database Block Changes (per transaction)
Database Block Gets (per second)
Database Block Gets (per transaction)
Database Time (centiseconds per second)
Database Time (centiseconds per transaction)
Database Time Spent Waiting (%)
DBWR Checkpoints (per second)
Data Dictionary Hit (%)
Row Cache Miss Ratio (%)
Free Dump Area (KB)
Dump Area Directory
Total Dump Area (KB)
Dump Area Used (KB)
Dump Area Used (%)
Enqueue Deadlocks (per second)
Enqueue Deadlocks (per transaction)
Enqueue Requests (per second)
Enqueue Requests (per transaction)
Enqueue Timeout (per second)
Enqueue Timeout (per transaction)
Enqueue Waits (per second)
Enqueue Waits (per transaction)
Executes Performed without Parses (%)
Executes (per second)
Executes (per transaction)
Parse Failure Count (per second)
Parse Failure Count (per transaction)
Final Change Number
Fixed SGA(MB)
Fast Recovery Area
Fast Recovery Area Size
Flashback On
Hard Parses (per second)
Hard Parses (per transaction)
Host CPU Utilization (%)
Full Index Scans (per second)
Full Index Scans (per transaction)
Total Index Scans (per second)
Total Index Scans (per transaction)
Sorts in Memory (%)
Inmemory Populate
Inmemory Query
I/O Megabytes (per second)
I/O Requests (per second)
isAppPdb
isAppPdb
isAppRoot
isAppRoot
Java Pool Free (%)
Java Pool(MB)
Large Pool Free (%)
Large Pool(MB)
Last Successful Archived Log Backup Date
Last Successful Archived Log Backup Media
Last Complete Disk Backup
Last Complete Media Backup
Last Successful Full Backup Date
Last Successful Full Backup Media
Last Executed Archived Log Backup Date
Last Executed Archived Log Backup Status
Last Executed Full Backup Date
Last Executed Full Backup Status
Last Executed Incremental Backup Date
Last Executed Incremental Backup Status
Last Executed Incremental Level 0 Backup Status
Last Successful Incremental Backup Date
Last Successful Incremental Backup Media
Last Successful Incremental Level 0 Backup Media
Leaf Node Splits (per second)
Leaf Node Splits (per transaction)
Library Cache Hit (%)
Library Cache Miss (%)
Log Buffer(MB)
Log Mode
Current Logons Count
Cumulative Logons (per second)
Cumulative Logons (per transaction)
Session Logical Reads (per second)
Session Logical Reads (per transaction)
Audited Host
Maximum Blocked DB Time (seconds)
Maximum Blocked Session Count
Network Bytes (per second)
Non-reclaimable Fast Recovery Area (%)
Oldest Flashback Time
Current Open Cursors Count
Open Cursors (per second)
Open Cursors (per transaction)
Optimal SGA Size (MB)
Other SGA Memory(MB)
Active Sessions Waiting: Other
Total Parses (per second)
Total Parses (per transaction)
Tablespace Space Used (%) (Undo)
pdbGuid
pdbGuid
pdbName
pdbName
PGA Total(MB)
PGA Cache Hit (%)
Physical Reads (per second)
Physical Reads (per transaction)
Physical Reads Direct (per second)
Physical Reads Direct (per transaction)
Physical Reads Direct Lobs (per second)
Physical Reads Direct Lobs (per transaction)
Physical Writes (per second)
Physical Writes (per transaction)
Physical Writes Direct (per second)
Physical Writes Direct (per transaction)
Physical Writes Direct Lobs (per second)
Physical Writes Direct Lobs (per transaction)
Process Limit Usage (%)
Parallel Execution Downgraded 25% or more (per second)
Parallel Execution Downgraded to Serial (per second)
Parallel Execution Downgraded to Serial (per transaction)
Reclaimable Fast Recovery Area (%)
Recovery Appliance
Recovery Appliance Downstream Two
Recursive Calls (per second)
Recursive Calls (per transaction)
Redo Log Allocation Hit (%)
Redo Generated (per second)
Redo Generated (per transaction)
Redo Writes (per second)
Redo Writes (per transaction)
Regular CPU
Recovery Appliance Downstream One
Recovery Appliance Replication Server List
Response Time (per transaction)
User Rollbacks (per second)
User Rollbacks (per transaction)
Rows Processed (per sort)
Disk Recovery Window (seconds)
Disk Recovery Window Goal(seconds)
Media Recovery Window (seconds)
Max SCN Jump Time (GMT)
Session Limit Usage (%)
SGA Size(MB)
Shared Pool Free (%)
Shared Pool(MB)
Soft Parse (%)
Sorts to Disk (per second)
Sorts to Disk (per transaction)
Sorts in memory (per second)
Sorts in memory (per transaction)
Rows sorted (per second)
Rows sorted (per transaction)
Streams Pool(MB)
Scans on Long Tables (per second)
Scans on Long Tables (per transaction)
Total Table Scans (per second)
Total Table Scans (per transaction)
Response Time (centi-seconds per call)
Total Wait Time (second)
Total Foreground Wait Time (second)
Total Number of Waits
Total Number of Foreground Waits
Total Memory Usage (MB)
Number of Transactions (per second)
Disk Unprotected Data Window (seconds)
Disk Unprotected Data Window Threshold (seconds)
Media Unprotected Data Window (seconds)
Usable Fast Recovery Area (%)
Active Sessions Using CPU
User Limit Usage (%)
Wait Time (%)
User Calls (%)
User Calls (per second)
User Calls (per transaction)
Active Sessions Waiting: I/O
Audited User
User Rollback Undo Records Applied (per second)
User Rollback Undo Records Applied (per transaction)
Wait Class Name
""".strip()


FEW_SHOT_EXAMPLES = """
示例（严格参考这些模式生成 SQL）：

Q: "查看 omrd 数据库的活动会话数"
A: {{"sql":"SELECT target_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_current WHERE LOWER(target_name) = LOWER('omrd') AND (column_label LIKE '%Session%' OR column_label LIKE '%Logon%') ORDER BY collection_timestamp DESC FETCH FIRST 20 ROWS ONLY"}}

Q: "列出所有主机"
A: {{"sql":"SELECT target_name, target_type, host_name, display_name FROM mgmt$target WHERE target_type = 'host' ORDER BY target_name FETCH FIRST 200 ROWS ONLY"}}

Q: "omrd 的 CPU 使用率是多少"
A: {{"sql":"SELECT target_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_current WHERE LOWER(target_name) = LOWER('omrd') AND (column_label LIKE '%CPU%') ORDER BY collection_timestamp DESC FETCH FIRST 20 ROWS ONLY"}}

Q: "当前有哪些未关闭的告警"
A: {{"sql":"SELECT incident_num, summary_msg, severity, priority, last_updated_date FROM mgmt$incidents WHERE open_status = 1 ORDER BY last_updated_date DESC FETCH FIRST 100 ROWS ONLY"}}

Q: "列出当前 19c 主机的告警有哪些"
A: {{"sql":"SELECT i.incident_num, i.summary_msg, i.severity, i.priority, i.last_updated_date, t.target_name, t.target_type FROM mgmt$incidents i INNER JOIN mgmt$target t ON i.target_guid = t.target_guid WHERE i.open_status = 1 AND (LOWER(t.target_type) = 'host' OR LOWER(t.target_type) = 'oracle_database') ORDER BY i.last_updated_date DESC FETCH FIRST 100 ROWS ONLY"}}

Q: "omrd 数据库的内存使用情况"
A: {{"sql":"SELECT target_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_current WHERE LOWER(target_name) = LOWER('omrd') AND (column_label LIKE '%Memory%' OR column_label LIKE '%SGA%' OR column_label LIKE '%PGA%') ORDER BY collection_timestamp DESC FETCH FIRST 30 ROWS ONLY"}}

Q: "omrd 数据库的 I/O 性能"
A: {{"sql":"SELECT target_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_current WHERE LOWER(target_name) = LOWER('omrd') AND (column_label LIKE '%I/O%' OR column_label LIKE '%Physical Read%' OR column_label LIKE '%Physical Write%') ORDER BY collection_timestamp DESC FETCH FIRST 30 ROWS ONLY"}}

Q: "omrd 的等待事件情况"
A: {{"sql":"SELECT target_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_current WHERE LOWER(target_name) = LOWER('omrd') AND (column_label LIKE '%Wait%') ORDER BY collection_timestamp DESC FETCH FIRST 30 ROWS ONLY"}}

Q: "哪些目标当前不可用"
A: {{"sql":"SELECT target_name, target_type, availability_status, start_collection_timestamp FROM sysman.mgmt$availability_current WHERE availability_status != 'Target Up' ORDER BY start_collection_timestamp DESC FETCH FIRST 100 ROWS ONLY"}}
""".strip()


class OemNl2SqlEngine:
    """LLM-first NL2SQL 引擎：LLM 为主路径，模板仅作 LLM 不可用时的离线降级。"""

    def __init__(self) -> None:
        api_key = (os.getenv("DEEPSEEK_API_KEY") or "").strip()
        base_url = (os.getenv("DEEPSEEK_BASE_URL") or "https://api.deepseek.com").strip()
        model = (os.getenv("DEEPSEEK_MODEL") or "deepseek-chat").strip()

        self.last_rejection: Optional[SqlRejection] = None

        self._llm: Optional[ChatOpenAI] = None
        if api_key:
            try:
                self._llm = ChatOpenAI(api_key=api_key, base_url=base_url, model=model, temperature=0.0)
            except Exception:
                self._llm = None

        self._chain = None
        if self._llm:
            self._chain = (
                ChatPromptTemplate.from_messages([
                    (
                        "system",
                        (
                            "你是 Oracle Enterprise Manager (OEM) 管理资料库 (OMR) 的 NL2SQL 生成器，支持中文和英文。\n\n"
                            "{view_schema}\n\n"
                            "{few_shot}\n\n"
                            "规则:\n"
                            "1. 只输出 JSON: {{\"sql\":\"...\"}}，不要输出任何其他内容\n"
                            "2. SQL 只能是单条 SELECT，不允许 DDL/DML，不允许分号\n"
                            "3. 只使用上述列出的视图，禁止使用 V$SESSION、V$PROCESS 等数据库动态视图\n"
                            "4. 查询指标数据时优先用 SYSMAN.MGMT$METRIC_CURRENT，通过 COLUMN_LABEL LIKE 过滤\n"
                            "5. 尽量加 WHERE 过滤和 FETCH FIRST N ROWS ONLY 限制行数\n"
                            "6. 如果问题中提到了目标名称，用 WHERE LOWER(TARGET_NAME) = LOWER('目标名') 过滤\n"
                            "7. 参考上方的示例 Q&A 来理解中文概念到 COLUMN_LABEL 的映射关系\n"
                            "8. 禁止在 MGMT$INCIDENTS 上直接使用 TARGET_NAME 或 TARGET_TYPE；必须先 JOIN MGMT$TARGET"
                        ),
                    ),
                    ("human", "问题: {question}"),
                ])
                | self._llm
                | StrOutputParser()
            )

    @staticmethod
    def _template_sql(question: str) -> Optional[str]:
        normalized = re.sub(r"@[A-Za-z0-9_:-]+\s*", "", question).strip()
        q = normalized.lower()

        if any(k in q for k in ["列出", "list", "目标", "targets", "有哪些"]) and any(
            k in q for k in ["主机", "host", "database", "数据库", "目标"]
        ):
            return (
                "SELECT target_name, target_type, display_name, host_name, last_load_time_utc "
                "FROM mgmt$target ORDER BY last_load_time_utc DESC NULLS LAST FETCH FIRST 200 ROWS ONLY"
            )

        if any(k in q for k in ["监控项", "监控指标", "metric", "metrics"]) and any(
            k in q for k in ["查看", "列出", "有哪些", "清单", "列表"]
        ):
            target_match = re.search(
                r"(?:查看|列出)?\s*([A-Za-z0-9._-]{2,})\s*(?:的)?\s*(?:监控项|监控指标|metrics?)",
                normalized,
                re.IGNORECASE,
            )
            target_name = target_match.group(1) if target_match else None
            if target_name:
                return (
                    "SELECT DISTINCT target_name, target_type, metric_name, metric_column, metric_label, column_label "
                    "FROM sysman.mgmt$metric_current "
                    f"WHERE LOWER(target_name)=LOWER('{target_name}') "
                    "ORDER BY metric_name, metric_column FETCH FIRST 300 ROWS ONLY"
                )

        if any(k in q for k in ["告警", "incident", "事件"]) and any(
            k in q for k in ["未关闭", "open", "当前", "current", "活跃"]
        ):
            return (
                "SELECT incident_num, summary_msg, severity, priority, owner, open_status, last_updated_date "
                "FROM mgmt$incidents WHERE open_status = 1 "
                "ORDER BY last_updated_date DESC NULLS LAST FETCH FIRST 100 ROWS ONLY"
            )

        if any(k in q for k in ["可用性", "availability", "在线", "离线", "down", "up"]):
            return (
                "SELECT target_name, target_type, availability_status, start_collection_timestamp "
                "FROM sysman.mgmt$availability_current "
                "ORDER BY start_collection_timestamp DESC NULLS LAST FETCH FIRST 200 ROWS ONLY"
            )

        # 通用指标查询：问题中包含目标名 + 任意指标关键词
        if any(k in q for k in ["cpu", "利用率", "指标", "当前值", "current", "会话", "session",
                                  "内存", "memory", "磁盘", "disk", "响应", "response"]):
            target_match = re.search(r"([A-Za-z0-9._-]{2,})", question)
            target_name = target_match.group(1) if target_match else None
            if target_name:
                return (
                    "SELECT target_name, target_type, metric_name, metric_column, "
                    "metric_label, column_label, value, collection_timestamp "
                    "FROM sysman.mgmt$metric_current "
                    f"WHERE LOWER(target_name) = LOWER('{target_name}') "
                    "ORDER BY collection_timestamp DESC FETCH FIRST 100 ROWS ONLY"
                )
        return None

    @staticmethod
    def _is_safe_sql(sql: str) -> tuple[bool, str]:
        """返回 (是否安全, 拒绝原因)。安全时原因为空字符串。"""
        s = sql.strip().lower()
        if not s.startswith("select"):
            return False, "SQL 不是 SELECT 语句"
        if ";" in s:
            return False, "SQL 包含分号（禁止多语句）"
        for bad in [" insert ", " update ", " delete ", " merge ", " drop ", " alter ", " truncate ", " create "]:
            if bad in f" {s} ":
                return False, f"SQL 包含禁止的关键词: {bad.strip()}"
        if not any(v in s for v in ALLOWED_VIEWS):
            return False, f"SQL 未使用允许的视图（允许: {', '.join(sorted(ALLOWED_VIEWS))}）"
        return True, ""

    def generate(self, question: str) -> Optional[SqlPlan]:
        """LLM 优先生成 SQL，LLM 不可用或失败时降级到模板。"""
        self.last_rejection = None

        # 主路径：LLM 生成
        if self._chain:
            plan = self._try_llm(question)
            if plan:
                return plan

        # 降级路径：模板匹配（LLM 不可用 或 LLM 生成失败）
        template = self._template_sql(question)
        if template:
            safe, reason = self._is_safe_sql(template)
            if safe:
                return SqlPlan(sql=template, source="template")
            self.last_rejection = SqlRejection(sql=template, reason=f"模板 SQL 安全检查失败: {reason}")

        return None

    def _try_llm(self, question: str) -> Optional[SqlPlan]:
        """调用 LLM 生成 SQL。成功返回 SqlPlan，失败记录 last_rejection 并返回 None。"""
        raw = ""
        try:
            raw = self._chain.invoke({
                "question": question,
                "view_schema": VIEW_SCHEMA_DESCRIPTION,
                "few_shot": FEW_SHOT_EXAMPLES,
            }).strip()
            if raw.startswith("```"):
                raw = re.sub(r"^```\w*\n?", "", raw)
                raw = re.sub(r"\n?```$", "", raw)
            data = json.loads(raw)
            sql = str(data.get("sql", "")).strip()
            if not sql:
                self.last_rejection = SqlRejection(sql="(空)", reason="LLM 返回的 JSON 中 sql 字段为空")
                return None
            safe, reason = self._is_safe_sql(sql)
            if safe:
                return SqlPlan(sql=sql, source="llm")
            self.last_rejection = SqlRejection(sql=sql, reason=reason)
        except json.JSONDecodeError as e:
            self.last_rejection = SqlRejection(sql=raw or "(空响应)", reason=f"LLM 返回非 JSON: {e}")
        except Exception as e:
            self.last_rejection = SqlRejection(sql="(异常)", reason=f"LLM 调用失败: {e}")
        return None
