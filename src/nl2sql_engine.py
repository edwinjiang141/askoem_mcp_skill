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


def parse_explicit_row_limit(question: str) -> Optional[int]:
    """
    从用户问题中解析「显式结果条数」。
    输入: 自然语言问题。
    输出: 正整数条数；未要求限制时返回 None。
    """
    if not (question or "").strip():
        return None
    s = question.strip()
    patterns = [
        r"(?:前|最前|仅|只)\s*(\d{1,6})\s*条",
        r"取\s*(?:前)?\s*(\d{1,6})\s*条",
        r"最\s*多\s*(\d{1,6})\s*条",
        r"(?i)\blimit\s+(\d{1,6})\b",
        r"(?i)\btop\s+(\d{1,6})\b",
        r"(?i)first\s+(\d{1,6})\s+rows?",
        r"(?i)fetch\s+first\s+(\d{1,6})",
        r"(\d{1,6})\s*条\s*记录",
    ]
    for pat in patterns:
        m = re.search(pat, s)
        if m:
            return max(1, min(int(m.group(1)), 1_000_000))
    return None


def _finalize_template_sql(
    select_wrapped_subquery: str,
    question: str,
    *,
    implied_limit: Optional[int] = None,
) -> str:
    """
    输入: 形如 SELECT ... FROM ( 内层 ... ORDER BY ... )，末尾无 ROWNUM、无别名。
    处理: implied_limit 优先；否则用 parse_explicit_row_limit(question)。
    输出: 有条数要求时追加 WHERE ROWNUM <= N；否则追加表别名 q（Oracle 内联视图）。
    """
    n = implied_limit if implied_limit is not None else parse_explicit_row_limit(question)
    s = select_wrapped_subquery.strip().rstrip()
    if n is None:
        if re.search(r"\)\s*$", s):
            return f"{s} q"
        return s
    cap = max(1, min(int(n), 1_000_000))
    return f"{s} WHERE ROWNUM <= {cap}"


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
    "mgmt$target_metric_settings",
    "sysman.mgmt$target_metric_settings",
}

# 视图 schema 描述，注入 LLM prompt，让 LLM 知道每个视图能查什么
VIEW_SCHEMA_DESCRIPTION = """
可用视图及其主要列:

1. MGMT$TARGET — 监控目标清单
   列: TARGET_NAME, TARGET_TYPE, DISPLAY_NAME, HOST_NAME, LAST_LOAD_TIME_UTC, TYPE_DISPLAY_NAME
   说明: 无 per-host 的 platform/version/内存/磁盘明细属性列；此类需求必须查 MGMT$TARGET_PROPERTIES。

2. MGMT$INCIDENTS — 告警/事件（注意：此视图无 TARGET_NAME、无 TARGET_TYPE，仅有 TARGET_GUID 关联目标）
   列: INCIDENT_ID, INCIDENT_NUM, SUMMARY_MSG, SEVERITY, PRIORITY, OWNER, CREATION_DATE, LAST_UPDATED_DATE,
       EVENT_COUNT, OPEN_STATUS(1=未关闭), CLOSED_DATE, TARGET_GUID
   需要目标名或目标类型时：JOIN MGMT$TARGET T ON MGMT$INCIDENTS.TARGET_GUID = T.TARGET_GUID，再用 T.TARGET_NAME / T.TARGET_TYPE 过滤

3. SYSMAN.MGMT$METRIC_CURRENT — 当前指标值（最近一次采集）
   列: TARGET_NAME, TARGET_TYPE, METRIC_NAME, METRIC_COLUMN, METRIC_LABEL, COLUMN_LABEL, VALUE, COLLECTION_TIMESTAMP, KEY_VALUE,VALUE
   重要: VALUE 在库中为字符串 (VARCHAR)；表空间利用率等可写 VALUE 与数字字面量比较（隐式转数字）；主机 CPU 利用率用 metric_name='Load' AND metric_column='cpuUtil' 时可用 TO_NUMBER(TRIM(VALUE)) 与阈值比较。
   主机「CPU 利用率」阈值筛选: target_type='host' AND metric_name='Load' AND metric_column='cpuUtil'，再 TO_NUMBER(TRIM(VALUE)) 与阈值比较。
   表空间「当前利用率」(%): target_type 为 oracle_database / rac_database，metric_name / column_label 含 tablespace 与 space used / used。
   筛选条件写「VALUE 与数字字面量比较」即可，例如 VALUE >= 0.15、VALUE > 15 AND VALUE < 30（Oracle 对 VARCHAR 做隐式转数字）；不要用 REGEXP_LIKE 预过滤以免漏行。
   自然语言「N percent」「N%」「百分之N」时阈值用 N/100；未写 percent 时阈值用 N（0–100 口径）。若某行 VALUE 非数字串导致 ORA-01722，再改为 TO_NUMBER(TRIM(REPLACE(VALUE,'%','')))。
   常见 METRIC_NAME 示例: load(CPU), Filesystems(磁盘), Response(响应时间), Session(会话), Memory(内存)

4. SYSMAN.MGMT$METRIC_DETAILS — 指标历史采集明细（多时间点，用于时间范围/趋势）
   列: TARGET_NAME（若库中存在）, TARGET_TYPE, METRIC_NAME, METRIC_COLUMN, METRIC_LABEL, COLUMN_LABEL, DESCRIPTION, COLLECTION_TIMESTAMP, KEY_VALUE, VALUE
   用途: 问题涉及「过去一周、几天、某时间段、几点到几点、最近 N 分钟」等需多条不同采集时间点的数据时，必须用本视图，在 WHERE 中用 COLLECTION_TIMESTAMP 与 SYSTIMESTAMP/SYSDATE 或 TRUNC/INTERVAL 限制范围；不要用 MGMT$METRIC_CURRENT 做时间序列（CURRENT 仅为当前快照）。
   若需目标名且本视图无 TARGET_NAME：JOIN MGMT$TARGET ON 相同 TARGET_GUID（视实际列名而定）。

5. MGMT$ALERT_CURRENT — 当前活跃告警
   列: TARGET_NAME, TARGET_TYPE, METRIC_NAME, METRIC_COLUMN, KEY_VALUE, ALERT_STATE, MESSAGE, COLLECTION_TIMESTAMP

6. SYSMAN.MGMT$AVAILABILITY_CURRENT — 可用性状态
   列: TARGET_NAME, TARGET_TYPE, AVAILABILITY_STATUS, START_COLLECTION_TIMESTAMP

7. MGMT$TARGET_PROPERTIES（或 SYSMAN.MGMT$TARGET_PROPERTIES）— 目标扩展属性键值
   列: TARGET_NAME, TARGET_TYPE, PROPERTY_NAME, PROPERTY_VALUE（具体列名以库为准，常用大写）
   用途: 主机 platform、OS version、memory、disk、storage、processor 等；WHERE target_type='host' 且对 PROPERTY_NAME 用 LIKE 匹配多类关键词。

8. SYSMAN.MGMT$TARGET_METRIC_SETTINGS — 目标上各指标的告警阈值设置（含表空间使用率阈值等）
   列: TARGET_NAME, TARGET_TYPE, METRIC_NAME, METRIC_COLUMN, METRIC_LABEL, WARNING_THRESHOLD, CRITICAL_THRESHOLD, KEY_VALUE 等
   重要: WARNING_THRESHOLD、CRITICAL_THRESHOLD 在库中多为 VARCHAR；与数字比较或 BETWEEN 时必须 TO_NUMBER(TRIM(...))，并先用 REGEXP_LIKE 限制为数字串，禁止直接 warning_threshold BETWEEN 15 AND 25。
   表空间相关阈值常见: metric_name 含 tablespace / problemTbsp，metric_column 含 pctUsed / 使用率等（以库中实际为准）。

9. COLUMN_LABEL 有如下类型：
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
示例（严格参考这些模式生成 SQL；未写清条数时不要加 ROWNUM；内联视图用别名 q）：

Q: "查看 omrd 数据库的活动会话数"
A: {{"sql":"SELECT target_name, column_label, value, collection_timestamp FROM ( SELECT target_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_current WHERE LOWER(target_name) = LOWER('omrd') AND (column_label LIKE '%Session%' OR column_label LIKE '%Logon%') ORDER BY collection_timestamp DESC ) q"}}

Q: "列出所有主机"
A: {{"sql":"SELECT target_name, target_type, host_name, display_name FROM ( SELECT target_name, target_type, host_name, display_name FROM mgmt$target WHERE target_type = 'host' ORDER BY target_name ) q"}}

Q: "只取前 50 条列出所有主机"
A: {{"sql":"SELECT target_name, target_type, host_name, display_name FROM ( SELECT target_name, target_type, host_name, display_name FROM mgmt$target WHERE target_type = 'host' ORDER BY target_name ) WHERE ROWNUM <= 50"}}

Q: "omrd 的 CPU 使用率是多少"
A: {{"sql":"SELECT target_name, column_label, value, collection_timestamp FROM ( SELECT target_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_current WHERE LOWER(target_name) = LOWER('omrd') AND (column_label LIKE '%CPU%') ORDER BY collection_timestamp DESC ) q"}}

Q: "当前有哪些未关闭的告警"
A: {{"sql":"SELECT incident_num, summary_msg, severity, priority, last_updated_date FROM ( SELECT incident_num, summary_msg, severity, priority, last_updated_date FROM mgmt$incidents WHERE open_status = 1 ORDER BY last_updated_date DESC ) q"}}

Q: "列出当前 19c 主机的告警有哪些"
A: {{"sql":"SELECT incident_num, summary_msg, severity, priority, last_updated_date, target_name, target_type FROM ( SELECT i.incident_num, i.summary_msg, i.severity, i.priority, i.last_updated_date, t.target_name, t.target_type FROM mgmt$incidents i INNER JOIN mgmt$target t ON i.target_guid = t.target_guid WHERE i.open_status = 1 AND (LOWER(t.target_type) = 'host' OR LOWER(t.target_type) = 'oracle_database') ORDER BY i.last_updated_date DESC ) q"}}

Q: "omrd 数据库的内存使用情况"
A: {{"sql":"SELECT target_name, column_label, value, collection_timestamp FROM ( SELECT target_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_current WHERE LOWER(target_name) = LOWER('omrd') AND (column_label LIKE '%Memory%' OR column_label LIKE '%SGA%' OR column_label LIKE '%PGA%') ORDER BY collection_timestamp DESC ) q"}}

Q: "omrd 数据库的 I/O 性能"
A: {{"sql":"SELECT target_name, column_label, value, collection_timestamp FROM ( SELECT target_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_current WHERE LOWER(target_name) = LOWER('omrd') AND (column_label LIKE '%I/O%' OR column_label LIKE '%Physical Read%' OR column_label LIKE '%Physical Write%') ORDER BY collection_timestamp DESC ) q"}}

Q: "omrd 的等待事件情况"
A: {{"sql":"SELECT target_name, column_label, value, collection_timestamp FROM ( SELECT target_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_current WHERE LOWER(target_name) = LOWER('omrd') AND (column_label LIKE '%Wait%') ORDER BY collection_timestamp DESC ) q"}}

Q: "哪些目标当前不可用"
A: {{"sql":"SELECT target_name, target_type, availability_status, start_collection_timestamp FROM ( SELECT target_name, target_type, availability_status, start_collection_timestamp FROM sysman.mgmt$availability_current WHERE availability_status != 'Target Up' ORDER BY start_collection_timestamp DESC ) q"}}

Q: "列出 omrdb 内存和 CPU 使用量，各取排名前三的指标"
A: {{"sql":"SELECT target_name, metric_name, column_label, value, collection_timestamp FROM ( SELECT target_name, metric_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_current WHERE LOWER(target_name) = LOWER('omrdb') AND ( LOWER(metric_name) LIKE '%load%' OR LOWER(metric_name) = 'load' OR LOWER(column_label) LIKE '%cpu%' OR LOWER(column_label) LIKE '%cpu time%' ) ORDER BY value DESC NULLS LAST ) WHERE ROWNUM <= 3 UNION ALL SELECT target_name, metric_name, column_label, value, collection_timestamp FROM ( SELECT target_name, metric_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_current WHERE LOWER(target_name) = LOWER('omrdb') AND ( LOWER(metric_name) LIKE '%memory%' OR LOWER(column_label) LIKE '%memory%' OR LOWER(column_label) LIKE '%sga%' OR LOWER(column_label) LIKE '%pga%' OR LOWER(column_label) LIKE '%buffer cache%' ) ORDER BY value DESC NULLS LAST ) WHERE ROWNUM <= 3"}}

Q: "查看 omrd 数据库过去一周 CPU 指标的变化趋势"
A: {{"sql":"SELECT target_name, column_label, value, collection_timestamp FROM ( SELECT target_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_details WHERE LOWER(target_name) = LOWER('omrd') AND ( column_label LIKE '%CPU%' OR column_label LIKE '%cpu time%' OR LOWER(metric_name) LIKE '%load%' ) AND collection_timestamp >= SYSTIMESTAMP - INTERVAL '7' DAY AND collection_timestamp <= SYSTIMESTAMP ORDER BY collection_timestamp ) q"}}

Q: "omrdb 最近 3 天内存相关指标的采集数据"
A: {{"sql":"SELECT target_name, metric_name, column_label, value, collection_timestamp FROM ( SELECT target_name, metric_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_details WHERE LOWER(target_name) = LOWER('omrdb') AND ( column_label LIKE '%Memory%' OR column_label LIKE '%SGA%' OR column_label LIKE '%PGA%' OR LOWER(metric_name) LIKE '%memory%' ) AND collection_timestamp >= SYSTIMESTAMP - INTERVAL '3' DAY AND collection_timestamp <= SYSTIMESTAMP ORDER BY collection_timestamp DESC ) q"}}

Q: "omrd 今天 9 点到 18 点的数据库 CPU 时间指标"
A: {{"sql":"SELECT target_name, column_label, value, collection_timestamp FROM ( SELECT target_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_details WHERE LOWER(target_name) = LOWER('omrd') AND ( column_label LIKE '%CPU Time%' OR column_label LIKE '%CPU%' ) AND collection_timestamp >= TRUNC(SYSTIMESTAMP) + INTERVAL '9' HOUR AND collection_timestamp < TRUNC(SYSTIMESTAMP) + INTERVAL '18' HOUR ORDER BY collection_timestamp ) q"}}

Q: "omrd 最近 15 分钟内采集到的 Session 相关指标"
A: {{"sql":"SELECT target_name, column_label, value, collection_timestamp FROM ( SELECT target_name, column_label, value, collection_timestamp FROM sysman.mgmt$metric_details WHERE LOWER(target_name) = LOWER('omrd') AND ( column_label LIKE '%Session%' OR column_label LIKE '%Logon%' ) AND collection_timestamp >= SYSTIMESTAMP - NUMTODSINTERVAL(15, 'MINUTE') AND collection_timestamp <= SYSTIMESTAMP ORDER BY collection_timestamp DESC ) q"}}

Q: "How do I find all hosts with more than 1 percent CPU utilization?"
A: {{"sql":"SELECT target_name, target_type, column_label, value, collection_timestamp, metric_name, metric_column FROM ( SELECT target_name, target_type, column_label, value, collection_timestamp, metric_name, metric_column FROM sysman.mgmt$metric_current WHERE target_type = 'host' AND metric_name = 'Load' AND metric_column = 'cpuUtil' AND REGEXP_LIKE(TRIM(value), '^[0-9]+(\\.[0-9]*)$') AND TO_NUMBER(TRIM(value)) > 1 ORDER BY TO_NUMBER(TRIM(value)) DESC NULLS LAST ) q"}}

Q: "How do I get the info of host (platform, version, memory, disk)?"
A: {{"sql":"SELECT target_name, target_type, property_name, property_value FROM ( SELECT target_name, target_type, property_name, property_value FROM sysman.mgmt$target_properties WHERE target_type = 'host' AND ( LOWER(property_name) LIKE '%platform%' OR LOWER(property_name) LIKE '%processor%' OR LOWER(property_name) LIKE '%version%' OR LOWER(property_name) LIKE '%memory%' OR LOWER(property_name) LIKE '%disk%' OR LOWER(property_name) LIKE '%storage%' OR LOWER(property_name) LIKE '%operating%' OR LOWER(property_name) LIKE '%os %' OR LOWER(property_name) LIKE '%cores%' ) ORDER BY target_name, property_name ) q"}}

Q: "How do I view a list of all database or RAC targets that have the tablespace thresholds set to between 15 and 25?"
A: {{"sql":"SELECT target_name, target_type, metric_name, metric_column, warning_threshold, critical_threshold, key_value FROM ( SELECT target_name, target_type, metric_name, metric_column, warning_threshold, critical_threshold, key_value FROM sysman.mgmt$target_metric_settings WHERE target_type IN ('oracle_database', 'rac_database') AND ( LOWER(metric_name) LIKE '%tablespace%' OR LOWER(metric_name) LIKE '%tbsp%' OR metric_name = 'problemTbsp' ) AND ( (REGEXP_LIKE(TRIM(warning_threshold), '^[0-9]+(\\.[0-9]*)$') AND TO_NUMBER(TRIM(warning_threshold)) BETWEEN 15 AND 25) OR (REGEXP_LIKE(TRIM(critical_threshold), '^[0-9]+(\\.[0-9]*)$') AND TO_NUMBER(TRIM(critical_threshold)) BETWEEN 15 AND 25) ) ORDER BY target_name, metric_name, metric_column ) q"}}

Q: "列出表空间利用率高于15小于30的数据库对象"
A: {{"sql":"SELECT target_name, target_type, metric_name, metric_column, column_label, key_value, value, collection_timestamp FROM ( SELECT target_name, target_type, metric_name, metric_column, column_label, key_value, value, collection_timestamp FROM sysman.mgmt$metric_current WHERE target_type IN ('oracle_database', 'rac_database') AND ( LOWER(metric_name) LIKE '%tablespace%' OR LOWER(metric_name) LIKE '%tbsp%' OR LOWER(metric_name) LIKE '%problem%' OR metric_name = 'problemTbsp' ) AND ( LOWER(column_label) LIKE '%space used%' OR LOWER(column_label) LIKE '%tablespace%space%used%' OR ( LOWER(column_label) LIKE '%used%' AND LOWER(column_label) LIKE '%tablespace%' ) OR LOWER(metric_column) LIKE '%pct%used%' OR LOWER(metric_column) LIKE '%pctused%' ) AND value > 15 AND value < 30 ORDER BY value DESC NULLS LAST ) q"}}

Q: "列出 omrdb 数据库表空间利用率大于 15 percent 的信息"
A: {{"sql":"SELECT target_name, target_type, metric_name, metric_column, column_label, key_value, value, collection_timestamp FROM ( SELECT target_name, target_type, metric_name, metric_column, column_label, key_value, value, collection_timestamp FROM sysman.mgmt$metric_current WHERE target_type IN ('oracle_database', 'rac_database') AND LOWER(target_name) = LOWER('omrdb') AND ( LOWER(metric_name) LIKE '%tablespace%' OR LOWER(metric_name) LIKE '%tbsp%' OR LOWER(metric_name) LIKE '%problem%' OR metric_name = 'problemTbsp' ) AND ( LOWER(column_label) LIKE '%space used%' OR LOWER(column_label) LIKE '%tablespace%space%used%' OR ( LOWER(column_label) LIKE '%used%' AND LOWER(column_label) LIKE '%tablespace%' ) OR LOWER(metric_column) LIKE '%pct%used%' OR LOWER(metric_column) LIKE '%pctused%' ) AND value >= 0.15 ORDER BY value DESC NULLS LAST ) q"}}
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
                            "4. 指标数据：只要「当前快照/最新值」用 SYSMAN.MGMT$METRIC_CURRENT + COLUMN_LABEL LIKE；"
                            "若问题涉及时间范围（一周、几天、某时段、几点到几点、最近 N 分钟等）且需要多条不同采集时间，必须用 SYSMAN.MGMT$METRIC_DETAILS，WHERE 用 COLLECTION_TIMESTAMP 限定范围\n"
                            "5. 结果行数：仅当用户在问题中明确写清条数（如前 N 条、取 N 条、limit N、top N 等）时，才用内层 SELECT … ORDER BY …，外层 WHERE ROWNUM <= N（不要用 FETCH FIRST）。未要求条数时不要加 ROWNUM；用内联视图时最外层加表别名，如 ) q\n"
                            "6. 如果问题中提到了目标名称，用 WHERE LOWER(TARGET_NAME) = LOWER('目标名') 过滤\n"
                            "7. 参考上方的示例 Q&A 来理解中文概念到 COLUMN_LABEL 的映射关系\n"
                            "8. 禁止在 MGMT$INCIDENTS 上直接使用 TARGET_NAME 或 TARGET_TYPE；必须先 JOIN MGMT$TARGET\n"
                            "9. 若问题要求「CPU 与内存各取前 N 条 / 各排名前三 / top N」：两段各自「内层 ORDER BY value DESC NULLS LAST，外层 WHERE ROWNUM <= N」，再用 UNION ALL 合并；N 必须来自用户表述\n"
                            "10. 若问题要求 K 类指标各取前 N 条：写 K 段子查询，每段内层 ORDER BY value DESC NULLS LAST，外层 WHERE ROWNUM <= N，再用 UNION ALL 拼成一条 SELECT；仅当用户明确 N 时如此写\n"
                            "11. 时间范围类问题：FROM 选 SYSMAN.MGMT$METRIC_DETAILS，条件含 collection_timestamp >= … AND collection_timestamp <= …（可用 SYSTIMESTAMP、INTERVAL、TRUNC、NUMTODSINTERVAL）；禁止仅用 MGMT$METRIC_CURRENT 冒充时间序列\n"
                            "12. MGMT$METRIC_CURRENT.VALUE 为 VARCHAR；表空间利用率等可写 VALUE 与数字字面量比较（隐式转数字）；其它场景优先 TO_NUMBER(TRIM(VALUE))。MGMT$METRIC_DETAILS.VALUE 同理。\n"
                            "13. 英文「hosts with more than N percent CPU utilization」类：target_type='host' AND metric_name='Load' AND metric_column='cpuUtil'，再 TO_NUMBER 与 N 比较。\n"
                            "14. 用户要 host 的 platform、version、memory、disk、OS、storage 等：必须查 MGMT$TARGET_PROPERTIES（SELECT property_name, property_value），禁止仅用 MGMT$TARGET 的 display_name/host_name 代替\n"
                            "15. 表空间阈值、metric 告警阈值（warning/critical）在 SYSMAN.MGMT$TARGET_METRIC_SETTINGS；对 WARNING_THRESHOLD/CRITICAL_THRESHOLD 做数值或 BETWEEN 比较时必须 TO_NUMBER(TRIM(...))；禁止对 MGMT$METRIC_CURRENT.VALUE 冒充阈值配置查询\n"
                            "16. 表空间当前利用率：用 SYSMAN.MGMT$METRIC_CURRENT；数值条件写 VALUE 与字面量比较（如 VALUE >= 0.15、VALUE > 15 AND VALUE < 30），不要用 REGEXP_LIKE 预过滤；问题含 percent、%、「百分之N」时阈值用 N/100；未写 percent 时用 N（0–100 口径）"
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

        # 主机 CPU 利用率阈值：Oracle 文档用 Load/cpuUtil；VALUE 为 VARCHAR，禁止裸 VALUE>N（ORA-01722）
        cpu_pct = re.search(
            r"(?:more than|greater than|>\s*|超过|高于)\s*(\d+(?:\.\d+)?)\s*(?:percent|%|％)",
            normalized,
            re.IGNORECASE,
        )
        wants_cpu_pct = "cpu" in q and (
            "utilization" in q
            or "utilisation" in q
            or ("util" in q and ("cpu" in q or "load" in q or "percent" in q or "%" in question))
            or "利用率" in question
            or "负载" in question
        )
        wants_hosts_scope = (
            "host" in q
            or "主机" in question
            or re.search(r"\ball\s+hosts\b", q, re.IGNORECASE) is not None
            or "所有主机" in question
        )
        if cpu_pct and wants_cpu_pct and wants_hosts_scope:
            thr = cpu_pct.group(1)
            return _finalize_template_sql(
                "SELECT target_name, target_type, column_label, value, collection_timestamp, metric_name, metric_column "
                "FROM ( "
                "SELECT target_name, target_type, column_label, value, collection_timestamp, metric_name, metric_column "
                "FROM sysman.mgmt$metric_current "
                "WHERE target_type = 'host' "
                "AND metric_name = 'Load' "
                "AND metric_column = 'cpuUtil' "
                "AND REGEXP_LIKE(TRIM(value), '^[0-9]+(\\.[0-9]*)$') "
                f"AND TO_NUMBER(TRIM(value)) > {thr} "
                "ORDER BY TO_NUMBER(TRIM(value)) DESC NULLS LAST "
                ")",
                normalized,
            )

        # 表空间当前利用率：直接 VALUE 与数字字面量比较（隐式转数字），避免 REGEXP_LIKE 过严导致无行；percent 语义阈值用 N/100
        has_ts = "表空间" in question or "tablespace" in q
        has_ts_util = has_ts and (
            "利用率" in question
            or "使用率" in question
            or ("utilization" in q and "tablespace" in q)
            or ("space used" in q and has_ts)
        )
        wants_ts_threshold_only = "阈值" in question and not (
            "利用率" in question or "使用率" in question
        )
        if has_ts_util and not wants_ts_threshold_only and "阈值" not in question:
            def _ts_thr_sql(x: float) -> str:
                if abs(x - round(x)) < 1e-12:
                    return str(int(round(x)))
                s = f"{x:.10f}".rstrip("0").rstrip(".")
                return s if s else "0"

            target_db = re.search(
                r"(?:列出|查询|获取|显示|的)?\s*([A-Za-z0-9._-]{2,})\s*数据库",
                normalized,
                re.IGNORECASE,
            )
            tgt_name = target_db.group(1) if target_db else None
            if tgt_name and tgt_name.lower() in {
                "list",
                "select",
                "show",
                "fetch",
                "the",
                "all",
                "any",
                "some",
            }:
                tgt_name = None
            tgt_where = ""
            if tgt_name:
                tesc = tgt_name.replace("'", "''")
                tgt_where = f"AND LOWER(target_name) = LOWER('{tesc}') "

            ts_select = (
                "SELECT target_name, target_type, metric_name, metric_column, "
                "column_label, key_value, value, collection_timestamp "
                "FROM ( "
                "SELECT target_name, target_type, metric_name, metric_column, "
                "column_label, key_value, value, collection_timestamp "
                "FROM sysman.mgmt$metric_current "
                "WHERE target_type IN ('oracle_database', 'rac_database') "
                f"{tgt_where}"
                "AND ( "
                "LOWER(metric_name) LIKE '%tablespace%' "
                "OR LOWER(metric_name) LIKE '%tbsp%' "
                "OR LOWER(metric_name) LIKE '%problem%' "
                "OR metric_name = 'problemTbsp' "
                ") "
                "AND ( "
                "LOWER(column_label) LIKE '%space used%' "
                "OR LOWER(column_label) LIKE '%tablespace%space%used%' "
                "OR ( LOWER(column_label) LIKE '%used%' AND LOWER(column_label) LIKE '%tablespace%' ) "
                "OR LOWER(metric_column) LIKE '%pct%used%' "
                "OR LOWER(metric_column) LIKE '%pctused%' "
                ") "
            )

            lo = hi = None
            exclusive = False
            m_cn = re.search(
                r"(?:高于|大于|超过)\s*(\d+(?:\.\d+)?)\s*(?:且|并|、)?\s*(?:小于|低于)\s*(\d+(?:\.\d+)?)",
                normalized,
            )
            m_cn_range = re.search(
                r"在\s*(\d+(?:\.\d+)?)\s*(?:到|和|至)\s*(\d+(?:\.\d+)?)\s*(?:之间|以内)",
                normalized,
            )
            m_en = re.search(
                r"(?:greater than|more than|>)\s*(\d+(?:\.\d+)?)\s*(?:and|&|,)\s*(?:less than|<)\s*(\d+(?:\.\d+)?)",
                normalized,
                re.IGNORECASE,
            )
            m_between = re.search(
                r"between\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)",
                normalized,
                re.IGNORECASE,
            )
            if m_cn:
                lo, hi = float(m_cn.group(1)), float(m_cn.group(2))
                exclusive = True
            elif m_en:
                lo, hi = float(m_en.group(1)), float(m_en.group(2))
                exclusive = True
            elif m_cn_range:
                lo, hi = float(m_cn_range.group(1)), float(m_cn_range.group(2))
                exclusive = False
                if re.search(
                    r"在\s*\d+\s*%|%\s*(?:到|和|至)|%\s*(?:之间|以内)|%\s*到\s*\d+%",
                    normalized,
                ):
                    lo, hi = lo / 100.0, hi / 100.0
            elif m_between and "threshold" not in q:
                lo, hi = float(m_between.group(1)), float(m_between.group(2))
                exclusive = False
                if re.search(
                    r"between\s+\d+(?:\.\d+)?\s+and\s+\d+(?:\.\d+)?\s+percent",
                    normalized,
                    re.IGNORECASE,
                ):
                    lo, hi = lo / 100.0, hi / 100.0
            if lo is not None and hi is not None:
                if lo > hi:
                    lo, hi = hi, lo
                lo_s, hi_s = _ts_thr_sql(lo), _ts_thr_sql(hi)
                if exclusive:
                    num_cond = (
                        f"AND value > {lo_s} "
                        f"AND value < {hi_s} "
                    )
                else:
                    num_cond = f"AND value BETWEEN {lo_s} AND {hi_s} "
                return _finalize_template_sql(
                    f"{ts_select}"
                    f"{num_cond}"
                    "ORDER BY value DESC NULLS LAST "
                    ")",
                    normalized,
                )

            thr: Optional[float] = None
            m_gt_pct = re.search(
                r"(?:大于|超过|高于|more than|greater than|>)\s*(\d+(?:\.\d+)?)\s*(?:percent|%|％)",
                normalized,
                re.IGNORECASE,
            )
            m_pct_cn = re.search(r"百分之\s*(\d+(?:\.\d+)?)", normalized)
            m_gt_100 = re.search(
                r"(?:大于|超过|高于|more than|greater than|>)\s*(\d+(?:\.\d+)?)(?!\s*(?:percent|%|％))",
                normalized,
                re.IGNORECASE,
            )
            if m_gt_pct:
                thr = float(m_gt_pct.group(1)) / 100.0
            elif m_pct_cn:
                thr = float(m_pct_cn.group(1)) / 100.0
            elif m_gt_100:
                thr = float(m_gt_100.group(1))
            if thr is not None:
                thr_s = _ts_thr_sql(thr)
                num_cond = f"AND value >= {thr_s} "
                return _finalize_template_sql(
                    f"{ts_select}"
                    f"{num_cond}"
                    "ORDER BY value DESC NULLS LAST "
                    ")",
                    normalized,
                )

        # 表空间告警阈值在 MGMT$TARGET_METRIC_SETTINGS；WARNING_THRESHOLD/CRITICAL_THRESHOLD 为 VARCHAR，须 TO_NUMBER
        ts_between = re.search(
            r"between\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)",
            normalized,
            re.IGNORECASE,
        )
        if (
            ts_between
            and "tablespace" in q
            and "threshold" in q
            and (
                "rac" in q
                or "database" in q
                or "oracle_database" in q
                or "rac_database" in q
            )
        ):
            lo, hi = ts_between.group(1), ts_between.group(2)
            return _finalize_template_sql(
                "SELECT target_name, target_type, metric_name, metric_column, "
                "warning_threshold, critical_threshold, key_value "
                "FROM ( "
                "SELECT target_name, target_type, metric_name, metric_column, "
                "warning_threshold, critical_threshold, key_value "
                "FROM sysman.mgmt$target_metric_settings "
                "WHERE target_type IN ('oracle_database', 'rac_database') "
                "AND ( "
                "LOWER(metric_name) LIKE '%tablespace%' "
                "OR LOWER(metric_name) LIKE '%tbsp%' "
                "OR LOWER(metric_name) LIKE '%problem%' "
                "OR metric_name = 'problemTbsp' "
                ") "
                "AND ( "
                "  (REGEXP_LIKE(TRIM(warning_threshold), '^[0-9]+(\\.[0-9]*)$') "
                f"   AND TO_NUMBER(TRIM(warning_threshold)) BETWEEN {lo} AND {hi}) "
                " OR (REGEXP_LIKE(TRIM(critical_threshold), '^[0-9]+(\\.[0-9]*)$') "
                f"   AND TO_NUMBER(TRIM(critical_threshold)) BETWEEN {lo} AND {hi}) "
                ") "
                "ORDER BY target_name, metric_name, metric_column "
                ")",
                normalized,
            )

        # platform / version / memory / disk 等：MGMT$TARGET 无这些列，须 TARGET_PROPERTIES
        prop_kw = (
            "platform",
            "version",
            "memory",
            "disk",
            "storage",
            "processor",
            "操作系统",
            "内存",
            "磁盘",
        )
        prop_hits = sum(1 for k in prop_kw if k in q)
        asks_host_props = prop_hits >= 2 or (
            prop_hits >= 1
            and any(
                x in q
                for x in (
                    "host",
                    "主机",
                    "info",
                    "information",
                    "property",
                    "properties",
                    "detail",
                )
            )
        )
        if asks_host_props:
            return _finalize_template_sql(
                "SELECT target_name, target_type, property_name, property_value "
                "FROM ( "
                "SELECT target_name, target_type, property_name, property_value "
                "FROM sysman.mgmt$target_properties "
                "WHERE target_type = 'host' "
                "AND ( "
                "LOWER(property_name) LIKE '%platform%' "
                "OR LOWER(property_name) LIKE '%processor%' "
                "OR LOWER(property_name) LIKE '%version%' "
                "OR LOWER(property_name) LIKE '%memory%' "
                "OR LOWER(property_name) LIKE '%disk%' "
                "OR LOWER(property_name) LIKE '%storage%' "
                "OR LOWER(property_name) LIKE '%operating%' "
                "OR LOWER(property_name) LIKE '%os %' "
                "OR LOWER(property_name) LIKE '%cores%' "
                ") "
                "ORDER BY target_name, property_name "
                ")",
                normalized,
            )

        if any(k in q for k in ["列出", "list", "目标", "targets", "有哪些"]) and any(
            k in q for k in ["主机", "host", "database", "数据库", "目标"]
        ):
            if "表空间" in question and (
                "利用率" in question or "使用率" in question
            ):
                pass
            else:
                return _finalize_template_sql(
                    "SELECT target_name, target_type, display_name, host_name, last_load_time_utc "
                    "FROM ( SELECT target_name, target_type, display_name, host_name, last_load_time_utc "
                    "FROM mgmt$target ORDER BY last_load_time_utc DESC NULLS LAST )",
                    normalized,
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
                return _finalize_template_sql(
                    "SELECT target_name, target_type, metric_name, metric_column, metric_label, column_label "
                    "FROM ( SELECT DISTINCT target_name, target_type, metric_name, metric_column, metric_label, column_label "
                    "FROM sysman.mgmt$metric_current "
                    f"WHERE LOWER(target_name)=LOWER('{target_name}') "
                    "ORDER BY metric_name, metric_column )",
                    normalized,
                )

        if any(k in q for k in ["告警", "incident", "事件"]) and any(
            k in q for k in ["未关闭", "open", "当前", "current", "活跃"]
        ):
            return _finalize_template_sql(
                "SELECT incident_num, summary_msg, severity, priority, owner, open_status, last_updated_date "
                "FROM ( SELECT incident_num, summary_msg, severity, priority, owner, open_status, last_updated_date "
                "FROM mgmt$incidents WHERE open_status = 1 "
                "ORDER BY last_updated_date DESC NULLS LAST )",
                normalized,
            )

        if any(k in q for k in ["可用性", "availability", "在线", "离线", "down", "up"]):
            return _finalize_template_sql(
                "SELECT target_name, target_type, availability_status, start_collection_timestamp "
                "FROM ( SELECT target_name, target_type, availability_status, start_collection_timestamp "
                "FROM sysman.mgmt$availability_current "
                "ORDER BY start_collection_timestamp DESC NULLS LAST )",
                normalized,
            )

        # CPU + 内存 + 各取前 N（须在「通用指标」模板之前匹配，否则会落到通用指标分支）
        topn_match = re.search(
            r"(前三|前3|前\s*三|top\s*3|top3|各取\s*(\d+)\s*条|各\s*(\d+)\s*条)",
            normalized,
            re.IGNORECASE,
        )
        has_cpu = "cpu" in q or "处理器" in question or "负载" in question
        has_mem = "内存" in question or "memory" in q
        if topn_match and has_cpu and has_mem:
            n = 3
            mnum = re.search(r"各取\s*(\d+)\s*条", normalized)
            if mnum:
                try:
                    n = max(1, min(20, int(mnum.group(1))))
                except ValueError:
                    n = 3
            target_match = re.search(
                r"(?:列出|查询|获取|显示|的)?\s*([A-Za-z0-9._-]{2,})\s*(?:数据库|实例|的)?\s*(?:内存|CPU|cpu)",
                normalized,
                re.IGNORECASE,
            )
            if not target_match:
                target_match = re.search(
                    r"(?:列出|查询)\s*([A-Za-z0-9._-]{2,})",
                    normalized,
                    re.IGNORECASE,
                )
            target_name = target_match.group(1) if target_match else None
            skip_targets = {
                "cpu",
                "memory",
                "fetch",
                "first",
                "rows",
                "only",
                "top",
                "sysman",
                "list",
                "select",
            }
            if (
                target_name
                and target_name.lower() not in skip_targets
                and len(target_name) >= 2
            ):
                t = target_name.replace("'", "''")
                nf = str(n)
                return (
                    "SELECT target_name, metric_name, column_label, value, collection_timestamp "
                    "FROM ( "
                    "SELECT target_name, metric_name, column_label, value, collection_timestamp "
                    "FROM sysman.mgmt$metric_current "
                    f"WHERE LOWER(target_name) = LOWER('{t}') "
                    "AND ( LOWER(metric_name) LIKE '%load%' OR LOWER(metric_name) = 'load' "
                    "OR LOWER(column_label) LIKE '%cpu%' OR LOWER(column_label) LIKE '%cpu time%' ) "
                    "ORDER BY value DESC NULLS LAST "
                    f") WHERE ROWNUM <= {nf} "
                    "UNION ALL "
                    "SELECT target_name, metric_name, column_label, value, collection_timestamp "
                    "FROM ( "
                    "SELECT target_name, metric_name, column_label, value, collection_timestamp "
                    "FROM sysman.mgmt$metric_current "
                    f"WHERE LOWER(target_name) = LOWER('{t}') "
                    "AND ( LOWER(metric_name) LIKE '%memory%' OR LOWER(column_label) LIKE '%memory%' "
                    "OR LOWER(column_label) LIKE '%sga%' OR LOWER(column_label) LIKE '%pga%' "
                    "OR LOWER(column_label) LIKE '%buffer cache%' ) "
                    "ORDER BY value DESC NULLS LAST "
                    f") WHERE ROWNUM <= {nf}"
                )

        # 通用指标查询：问题中包含目标名 + 任意指标关键词
        if any(k in q for k in ["cpu", "利用率", "指标", "当前值", "current", "会话", "session",
                                  "内存", "memory", "磁盘", "disk", "响应", "response"]):
            target_match = re.search(r"([A-Za-z0-9._-]{2,})", question)
            target_name = target_match.group(1) if target_match else None
            if target_name:
                return _finalize_template_sql(
                    "SELECT target_name, target_type, metric_name, metric_column, "
                    "metric_label, column_label, value, collection_timestamp "
                    "FROM ( SELECT target_name, target_type, metric_name, metric_column, "
                    "metric_label, column_label, value, collection_timestamp "
                    "FROM sysman.mgmt$metric_current "
                    f"WHERE LOWER(target_name) = LOWER('{target_name}') "
                    "ORDER BY collection_timestamp DESC )",
                    normalized,
                )
        return None

    @staticmethod
    def _has_unsafe_varchar_numeric_compare(sql: str) -> bool:
        """
        VALUE / WARNING_THRESHOLD / CRITICAL_THRESHOLD 等在 OMR 中多为 VARCHAR；
        直接与数字比较或 BETWEEN 会 ORA-01722。仅当比较左侧为 to_number(trim(col)) 才放行。
        """
        s = re.sub(r"/\*[\s\S]*?\*/", "", sql)
        s = re.sub(r"--[^\n]*", "", s)
        sl = s.lower()
        # VALUE 允许与数字字面量隐式比较（表空间等模板）；阈值列仍须 TO_NUMBER(TRIM(...))
        cols = ("warning_threshold", "critical_threshold")
        for col in cols:
            if re.search(rf"\b{col}\b\s+between\s+[\d.]+\s+and\s+[\d.]+", sl):
                if re.search(
                    rf"to_number\s*\(\s*trim\s*\(\s*{col}\s*\)\s*\)\s+between\s+[\d.]+\s+and\s+[\d.]+",
                    sl,
                ):
                    continue
                return True
            if re.search(rf"\b{col}\b\s*(?:>=|<=|>|<)\s*[\d.]+", sl):
                if re.search(
                    rf"to_number\s*\(\s*trim\s*\(\s*{col}\s*\)\s*\)\s*(?:>=|<=|>|<)\s*[\d.]+",
                    sl,
                ):
                    continue
                return True
            if re.search(rf"trim\s*\(\s*{col}\s*\)\s+between\s+[\d.]+\s+and\s+[\d.]+", sl):
                if re.search(
                    rf"to_number\s*\(\s*trim\s*\(\s*{col}\s*\)\s*\)\s+between\s+[\d.]+\s+and\s+[\d.]+",
                    sl,
                ):
                    continue
                return True
            if re.search(rf"trim\s*\(\s*{col}\s*\)\s*(?:>=|<=|>|<)\s*[\d.]+", sl):
                if re.search(
                    rf"to_number\s*\(\s*trim\s*\(\s*{col}\s*\)\s*\)\s*(?:>=|<=|>|<)\s*[\d.]+",
                    sl,
                ):
                    continue
                return True
        return False

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
        if OemNl2SqlEngine._has_unsafe_varchar_numeric_compare(sql):
            return (
                False,
                "禁止对 VARCHAR 型 WARNING_THRESHOLD/CRITICAL_THRESHOLD 直接写与数字的 >、<、=、BETWEEN；"
                "须 TO_NUMBER(TRIM(列))，否则 ORA-01722",
            )
        return True, ""

    @staticmethod
    def _strip_llm_trailing_rownum_without_user_limit(sql: str, question: str) -> str:
        """用户未要求条数时去掉 LLM 在末尾自动加的 WHERE ROWNUM <= N，并补内联视图别名 q。"""
        if parse_explicit_row_limit(question) is not None:
            return sql
        if re.search(r"\bunion\s+all\b", sql, re.IGNORECASE):
            return sql
        s = sql.strip()
        s2 = re.sub(r"\s*WHERE\s+ROWNUM\s*<=\s*\d+\s*$", "", s, flags=re.IGNORECASE)
        if s2 == s:
            return sql
        if not re.search(r"\)\s*$", s2.rstrip()):
            return sql
        return s2 + " q"

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
            sql = OemNl2SqlEngine._strip_llm_trailing_rownum_without_user_limit(sql, question)
            safe, reason = self._is_safe_sql(sql)
            if safe:
                return SqlPlan(sql=sql, source="llm")
            self.last_rejection = SqlRejection(sql=sql, reason=reason)
        except json.JSONDecodeError as e:
            self.last_rejection = SqlRejection(sql=raw or "(空响应)", reason=f"LLM 返回非 JSON: {e}")
        except Exception as e:
            self.last_rejection = SqlRejection(sql="(异常)", reason=f"LLM 调用失败: {e}")
        return None
