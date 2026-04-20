"""
Skill 工作流：从 SKILL.md 规划步骤，按步调用 AskOpsService.execute_skill_omr_sql（非 execute_omr_sql），再汇总为四段回答。

设计约束（与 MVP 一致）：
- read_sql 使用 Skill 专用入口：不校验 OEM 管理视图白名单，允许 gv$/v$ 等诊断 SQL；禁止 DML；多条只读语句可用分号分隔并按顺序执行（execute_skill_omr_sql）。
- 写 SQL（kill/update 等）不执行，只进入「下一步建议」。
- 步数上限与循环检测在 Executor 内硬编码，避免失控调用。
"""
from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Tuple

_log = logging.getLogger("askoem.skill_workflow")

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from src.skill_engine import (
    SkillMetadata,
    SkillRegistry,
    _create_llm,
    _is_llm_configured,
)

# 单轮 run_skill 内最多执行的步数（含 decision，不含 planner/synthesizer）
MAX_WORKFLOW_STEPS = 8

SqlRunner = Callable[[str], dict[str, Any]]


def _preview_text(text: str, limit: int = 400) -> str:
    """单行日志用：换行压成空格并截断。"""
    t = (text or "").replace("\n", " ").strip()
    if len(t) <= limit:
        return t
    return t[:limit] + "..."


@dataclass
class StepResult:
    """单步执行记录，供汇总与调试。"""

    step_id: str
    title: str
    step_type: str
    ok: bool
    detail: str
    sql: Optional[str] = None


def _extract_json_object(text: str) -> dict[str, Any]:
    """从 LLM 输出中解析 JSON 对象（支持裸 JSON 或 ```json 代码块）。"""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    return json.loads(text)


def _classify_sql_type(sql: str) -> str:
    """将 SQL 粗分为 read_sql 或 write_sql（Planner 也会分类，此处为双保险）。"""
    s = sql.strip().rstrip(";").strip()
    low = s.lower()
    if not low:
        return "info"
    if low.startswith("select") or low.startswith("with") or low.startswith("explain"):
        return "read_sql"
    dangerous = (
        "insert ",
        "update ",
        "delete ",
        "merge ",
        "truncate ",
        "drop ",
        "alter ",
        "create ",
        "grant ",
        "revoke ",
        "execute ",
        "call ",
    )
    for d in dangerous:
        if d in low:
            return "write_sql"
    return "write_sql"


def plan_workflow_steps(
    skill: SkillMetadata,
    user_question: str,
    fetch_context: Optional[dict[str, Any]],
) -> dict[str, Any]:
    """
    输入：Skill 元数据、用户问题、fetch_data 上下文。
    输出：含 steps 列表的规划 dict；失败抛异常。
    """
    if not _is_llm_configured():
        raise RuntimeError("LLM 未配置")

    t0 = time.perf_counter()
    skill_chars = len(skill.full_content or "")
    _log.info(
        "plan_workflow_steps start skill=%s skill_md_chars=%s ctx_json_chars=%s",
        skill.name,
        skill_chars,
        min(12000, len(json.dumps(fetch_context or {}, ensure_ascii=False))),
    )
    llm = _create_llm(temperature=0)
    ctx_json = json.dumps(fetch_context or {}, ensure_ascii=False, indent=2)[:12000]
    chain = (
        ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    (
                        "你是应急工作流规划器。根据 SKILL.md 与用户问题，输出**仅含一个 JSON 对象**（不要 markdown 解释）。\n"
                        "JSON schema:\n"
                        '{{"steps":[{{"id":"唯一英文id","title":"标题","type":"read_sql|write_sql|decision|info",'
                        '"sql":"单条 SQL，仅 read_sql/write_sql 需要","content":"info 时说明文字",'
                        '"condition":"decision 时：根据哪些前置结果做何判断",'
                        '"depends_on":["前置 step id"],"branch_options":[{{"label":"分支说明","next":"下一步 id 或 STOP"}}]}}]}}\n'
                        "规则：\n"
                        "1. 从 SKILL.md 的 SQL 代码块提取语句；SELECT/EXPLAIN/WITH 为 read_sql；含 kill/alter/update/delete 等为 write_sql。\n"
                        "2. write_sql 步骤仍要列出，但执行器不会运行，只作为建议。\n"
                        "3. 分支用 decision 类型，depends_on 填依赖的步骤 id；branch_options 给出可选 next（含 STOP）。\n"
                        "4. 步骤总数不超过 8；depends_on 必须指向已存在的 id，禁止环。\n"
                        "5. id 只用字母数字下划线。"
                    ),
                ),
                (
                    "human",
                    "用户问题：\n{user_question}\n\nfetch 上下文（JSON）：\n{ctx}\n\n--- SKILL.md ---\n{skill_md}",
                ),
            ]
        )
        | llm
        | StrOutputParser()
    )
    try:
        raw = chain.invoke(
            {
                "user_question": user_question,
                "ctx": ctx_json,
                "skill_md": skill.full_content[:60000],
            }
        )
        plan = _extract_json_object(raw)
        nsteps = len(plan.get("steps") or []) if isinstance(plan.get("steps"), list) else 0
        _log.info(
            "plan_workflow_steps done skill=%s steps=%s elapsed_sec=%.2f",
            skill.name,
            nsteps,
            time.perf_counter() - t0,
        )
        return plan
    except Exception:
        _log.exception(
            "plan_workflow_steps failed skill=%s elapsed_sec=%.2f",
            skill.name,
            time.perf_counter() - t0,
        )
        raise


def _topological_ready(
    steps: List[dict[str, Any]], completed: set[str]
) -> List[dict[str, Any]]:
    """返回依赖已满足的步骤（未完成）。"""
    ready: List[dict[str, Any]] = []
    for s in steps:
        sid = s.get("id")
        if not sid or sid in completed:
            continue
        deps = s.get("depends_on") or []
        if all(d in completed for d in deps):
            ready.append(s)
    return ready


def run_decision(
    step: dict[str, Any],
    prior_text: str,
    branch_options: List[dict[str, Any]],
) -> str:
    """decision 步骤：返回 next 的 step id 或 STOP。"""
    try:
        llm = _create_llm(temperature=0)
    except Exception:
        return "STOP"
    opts = json.dumps(branch_options, ensure_ascii=False)
    chain = (
        ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "根据「前置执行结果」与「分支条件」选择下一步。只输出 JSON：{{\"next\":\"步骤id或STOP\"}}",
                ),
                (
                    "human",
                    "条件说明：\n{cond}\n\n前置结果摘要：\n{prior}\n\n可选分支：\n{opts}",
                ),
            ]
        )
        | llm
        | StrOutputParser()
    )
    t0 = time.perf_counter()
    try:
        raw = chain.invoke(
            {
                "cond": step.get("condition") or "",
                "prior": prior_text[:8000],
                "opts": opts,
            }
        )
        data = _extract_json_object(raw)
        nxt = str(data.get("next", "STOP")).strip()
        _log.info(
            "run_decision done next=%s elapsed_sec=%.2f branches=%s",
            nxt,
            time.perf_counter() - t0,
            _preview_text(opts, 800),
        )
        return nxt
    except Exception:
        _log.warning(
            "run_decision parse/invoke failed elapsed_sec=%.2f",
            time.perf_counter() - t0,
        )
        return "STOP"


def execute_workflow_plan(
    steps: List[dict[str, Any]],
    sql_runner: SqlRunner,
    omr_available: bool,
) -> Tuple[List[StepResult], List[dict[str, str]]]:
    """
    按依赖与分支执行规划。

    输入：steps、sql_runner（通常为 lambda s: service.execute_omr_sql(s, sid)）、是否 omr_db。
    输出：StepResult 列表、未执行的 write_sql 建议列表 {title, sql}。
    """
    results: List[StepResult] = []
    pending_writes: List[dict[str, str]] = []
    completed: set[str] = set()
    by_id = {s["id"]: s for s in steps if s.get("id")}
    order_index = {str(s["id"]): i for i, s in enumerate(steps)}
    total_actions = 0
    current_id: Optional[str] = None

    while total_actions < MAX_WORKFLOW_STEPS:
        ready = _topological_ready(steps, completed)
        if not ready:
            break
        ready.sort(key=lambda x: order_index.get(str(x.get("id")), 999))
        step: Optional[dict[str, Any]] = None
        if current_id and current_id in by_id:
            cand = by_id[current_id]
            if cand.get("id") not in completed and all(
                d in completed for d in (cand.get("depends_on") or [])
            ):
                step = cand
            current_id = None
        if step is None:
            step = ready[0]
        sid = step["id"]
        stype = (step.get("type") or "info").lower()
        title = str(step.get("title") or sid)
        _log.info(
            "workflow_step_begin id=%s type=%s title=%s ready_count=%s follow_current=%s",
            sid,
            stype,
            _preview_text(title, 120),
            len(ready),
            current_id,
        )

        if stype == "read_sql":
            sql = (step.get("sql") or "").strip()
            if not sql:
                _log.info("workflow_step_read_sql skip id=%s reason=missing_sql", sid)
                results.append(
                    StepResult(sid, title, stype, False, "read_sql 缺少 sql", None)
                )
            elif not omr_available:
                _log.info(
                    "workflow_step_read_sql skip id=%s reason=no_omr sql_preview=%r",
                    sid,
                    _preview_text(sql, 500),
                )
                results.append(
                    StepResult(
                        sid,
                        title,
                        stype,
                        False,
                        "当前非 omr_db 或未配置 OMR，跳过 SQL 执行。",
                        sql,
                    )
                )
            elif _classify_sql_type(sql) != "read_sql":
                _log.info(
                    "workflow_step_read_sql skip id=%s reason=not_read_only sql_preview=%r",
                    sid,
                    _preview_text(sql, 500),
                )
                results.append(
                    StepResult(
                        sid,
                        title,
                        stype,
                        False,
                        "安全检查：非只读 SQL，未执行。",
                        sql,
                    )
                )
            else:
                _log.debug("workflow_step_read_sql sql_full id=%s\n%s", sid, sql)
                t_sql = time.perf_counter()
                out = sql_runner(sql)
                ok = bool(out.get("ok"))
                detail = str(out.get("result") or out.get("report") or "")
                _log.info(
                    "workflow_step_read_sql id=%s ok=%s sql_len=%s sql_elapsed_sec=%.2f detail_preview=%r",
                    sid,
                    ok,
                    len(sql),
                    time.perf_counter() - t_sql,
                    _preview_text(detail, 600),
                )
                results.append(
                    StepResult(sid, title, stype, ok, detail[:20000], sql)
                )
            completed.add(sid)
            total_actions += 1
            current_id = None
            continue

        if stype == "write_sql":
            sql = (step.get("sql") or "").strip()
            _log.info(
                "workflow_step_write_sql id=%s title=%s record_only sql_preview=%r",
                sid,
                _preview_text(title, 80),
                _preview_text(sql, 500),
            )
            pending_writes.append({"title": title, "sql": sql})
            results.append(
                StepResult(
                    sid,
                    title,
                    stype,
                    True,
                    "写操作未执行（MVP 只读），已记入建议。",
                    sql,
                )
            )
            completed.add(sid)
            total_actions += 1
            current_id = None
            continue

        if stype == "info":
            content = str(step.get("content") or "")
            _log.info(
                "workflow_step_info id=%s content_preview=%r",
                sid,
                _preview_text(content, 500),
            )
            results.append(
                StepResult(sid, title, stype, True, content[:8000], None)
            )
            completed.add(sid)
            total_actions += 1
            current_id = None
            continue

        if stype == "decision":
            prior = "\n".join(f"{r.step_id}: {r.detail[:2000]}" for r in results)
            branches = step.get("branch_options") or []
            if not branches:
                branches = [{"label": "结束", "next": "STOP"}]
            _log.info(
                "workflow_step_decision id=%s condition_preview=%r branch_count=%s",
                sid,
                _preview_text(str(step.get("condition") or ""), 400),
                len(branches),
            )
            nxt = run_decision(step, prior, branches)
            _log.info(
                "workflow_step_decision id=%s chosen_next=%s valid=%s",
                sid,
                nxt,
                nxt == "STOP" or nxt in by_id,
            )
            completed.add(sid)
            total_actions += 1
            if nxt == "STOP" or nxt not in by_id:
                break
            current_id = nxt
            continue

        # 未知类型当 info
        _log.info(
            "workflow_step_unknown_type id=%s raw_type=%s coerced=info",
            sid,
            stype,
        )
        results.append(
            StepResult(sid, title, "info", True, str(step)[:2000], None)
        )
        completed.add(sid)
        total_actions += 1

    return results, pending_writes


def synthesize_workflow_report(
    skill: SkillMetadata,
    user_question: str,
    step_results: List[StepResult],
    pending_writes: List[dict[str, str]],
    fetch_context: Optional[dict[str, Any]],
) -> str:
    """汇总为固定四段：结论 / 证据 / 下一步建议 / 深挖入口。"""
    if not _is_llm_configured():
        lines = ["## 1. 结论", "LLM 未配置，无法生成汇总。", "## 2. 证据"]
        for r in step_results:
            lines.append(f"- {r.title}: {'成功' if r.ok else '失败'}\n{r.detail[:1500]}")
        if pending_writes:
            lines.append("## 3. 下一步建议（未执行）")
            for w in pending_writes[:3]:
                lines.append(f"- {w['title']}\n{w.get('sql', '')}")
        return "\n".join(lines)

    t0 = time.perf_counter()
    _log.info(
        "synthesize_workflow_report start skill=%s step_count=%s",
        skill.name,
        len(step_results),
    )
    llm = _create_llm(temperature=0.3)
    evidence = json.dumps(
        [
            {
                "step": r.step_id,
                "title": r.title,
                "type": r.step_type,
                "ok": r.ok,
                "detail": r.detail[:4000],
                "sql": r.sql,
            }
            for r in step_results
        ],
        ensure_ascii=False,
        indent=2,
    )
    writes = json.dumps(pending_writes, ensure_ascii=False, indent=2)
    ctx = json.dumps(fetch_context or {}, ensure_ascii=False, indent=2)[:6000]

    chain = (
        ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    (
                        "你是 OEM 运维顾问。根据 SKILL 与执行结果，输出固定四段（用中文，Markdown 二级标题）：\n"
                        "## 1. 结论\n"
                        "## 2. 证据（引用已执行步骤与 OEM/OMR 数据）\n"
                        "## 3. 下一步建议（至多 3 条可执行项；"
                        "写操作仅复述 SKILL 中的命令原文，声明须人工在库中执行）\n"
                        "## 4. 深挖入口（OEM 控制台 / 知识库路径）\n"
                        "不要编造未执行的 SQL 结果；无数据时说明缺口。"
                    ),
                ),
                (
                    "human",
                    "用户问题：{q}\n\nSKILL 名称：{sn}\n\nfetch 上下文：\n{ctx}\n\n"
                    "执行证据 JSON：\n{ev}\n\n未执行的写操作 JSON：\n{pw}",
                ),
            ]
        )
        | llm
        | StrOutputParser()
    )
    text = chain.invoke(
        {
            "q": user_question,
            "sn": skill.name,
            "ctx": ctx,
            "ev": evidence,
            "pw": writes,
        }
    )
    _log.info(
        "synthesize_workflow_report done skill=%s elapsed_sec=%.2f out_chars=%s",
        skill.name,
        time.perf_counter() - t0,
        len(text) if isinstance(text, str) else 0,
    )
    return text


def run_skill_workflow_pipeline(
    registry: SkillRegistry,
    skill_name: str,
    user_question: str,
    fetch_context: Optional[dict[str, Any]],
    sql_runner: SqlRunner,
    omr_available: bool,
) -> Tuple[str, str]:
    """
    输入：注册表、skill 名、问题、上下文、SQL 执行器、OMR 是否可用。
    输出：(最终文本, skill_name)。
    """
    t_all = time.perf_counter()
    skill = registry.get_skill(skill_name)
    if not skill:
        _log.warning("run_skill_workflow_pipeline missing skill=%s", skill_name)
        return f"错误: Skill '{skill_name}' 未加载", skill_name

    _log.info(
        "run_skill_workflow_pipeline start skill=%s omr_available=%s question_preview=%r",
        skill_name,
        omr_available,
        (user_question or "")[:240],
    )
    plan = plan_workflow_steps(skill, user_question, fetch_context)
    raw_steps = plan.get("steps")
    if not isinstance(raw_steps, list) or not raw_steps:
        _log.warning("run_skill_workflow_pipeline empty plan skill=%s", skill_name)
        return "工作流规划为空，请检查 SKILL.md 是否含可执行步骤。", skill_name

    steps = [s for s in raw_steps if isinstance(s, dict) and s.get("id")]
    plan_meta = [
        {
            "id": s.get("id"),
            "type": s.get("type"),
            "title": s.get("title"),
            "depends_on": s.get("depends_on"),
        }
        for s in steps
    ]
    _log.info(
        "workflow_plan_snapshot skill=%s step_count=%s graph=%s",
        skill_name,
        len(steps),
        json.dumps(plan_meta, ensure_ascii=False),
    )
    for s in steps:
        st = str(s.get("type") or "").lower()
        if st in ("read_sql", "write_sql") and (s.get("sql") or "").strip():
            _log.info(
                "workflow_plan_sql skill=%s id=%s type=%s preview=%r",
                skill_name,
                s.get("id"),
                st,
                _preview_text(str(s.get("sql") or ""), 600),
            )
    t_ex = time.perf_counter()
    results, pending_writes = execute_workflow_plan(steps, sql_runner, omr_available)
    _log.info(
        "execute_workflow_plan done skill=%s step_results=%s pending_writes=%s elapsed_sec=%.2f",
        skill_name,
        len(results),
        len(pending_writes),
        time.perf_counter() - t_ex,
    )
    text = synthesize_workflow_report(
        skill, user_question, results, pending_writes, fetch_context
    )
    _log.info(
        "run_skill_workflow_pipeline end skill=%s total_elapsed_sec=%.2f",
        skill_name,
        time.perf_counter() - t_all,
    )
    return text, skill_name
