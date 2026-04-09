from __future__ import annotations

import json
import os
from pathlib import Path
from typing import TYPE_CHECKING

import httpx

from src.env_loader import load_env_from_file
from src.sop_engine import build_sop_recommendation

if TYPE_CHECKING:
    from src.service import FetchDataResult


SKILL_BASE_DIR = Path("skills/cpu_alert_mvp")
DEFAULT_TEMPLATE = (
    "【CPU告警诊断Skill】\n"
    "结论: {conclusion}\n"
    "证据: {evidence}\n"
    "SOP建议:\n"
    "{sop}\n"
    "下一步: {next_step}\n"
)


def _load_template() -> str:
    template_path = SKILL_BASE_DIR / "assets" / "output_template.md"
    if not template_path.exists():
        return DEFAULT_TEMPLATE
    return template_path.read_text(encoding="utf-8")


def render_cpu_alert_skill(fetched: "FetchDataResult") -> str:
    """
    CPU 告警 Skill 渲染入口。

    输入：
    - fetched: 由数据层（AskOpsService.fetch_data）返回的结构化结果。

    输出：
    - 已套用 Skill 模板的最终文本，包含结论、证据、SOP、下一步。
    """
    llm_result = _render_cpu_alert_with_llm(fetched)
    if llm_result:
        return llm_result

    target = fetched.target_name or "未指定目标"
    evidence = (
        f"scenario={fetched.scenario}, classifier={fetched.classifier}, confidence={fetched.confidence or 0:.2f}, "
        f"latestData={len(fetched.latest_data)}, timeSeries={len(fetched.metric_time_series)}, "
        f"incidents={len(fetched.incidents)}, events={len(fetched.events)}"
    )
    sop = build_sop_recommendation(
        scenario="cpu_high",
        target_name=fetched.target_name,
        incidents=fetched.incidents,
        events=fetched.events,
        metric_bundle=None,
    )
    template = _load_template()
    return template.format(
        target=target,
        conclusion=f"检测到 {target} 的 CPU 高告警迹象，请按下述SOP优先处置。",
        evidence=evidence,
        sop=sop,
        next_step="如需继续分析，请补充具体时间窗（如最近1小时）或补充并发业务变化信息。",
    )


def _render_cpu_alert_with_llm(fetched: "FetchDataResult") -> str | None:
    """
    AI 渲染路径（可选）：
    1) 从 .env 读取 DeepSeek/OpenAI-compatible 配置；
    2) 读取 skill.md + references，作为约束上下文；
    3) 让模型按固定 JSON Schema 产出结论/证据/SOP/下一步；
    4) 成功则套用模板返回，失败时回退到规则模板。
    """
    load_env_from_file(".env")
    api_key = os.getenv("DEEPSEEK_API_KEY", "").strip() or os.getenv("AI_GATEWAY_LLM_API_KEY", "").strip()
    endpoint = os.getenv("DEEPSEEK_BASE_URL", "").strip() or os.getenv("AI_GATEWAY_LLM_ENDPOINT", "").strip()
    model = os.getenv("DEEPSEEK_MODEL", "").strip() or os.getenv("AI_GATEWAY_LLM_MODEL", "deepseek-chat").strip()
    if not api_key or not endpoint:
        return None
    endpoint = endpoint.rstrip("/")
    if "chat/completions" not in endpoint:
        endpoint = f"{endpoint}/chat/completions"

    skill_spec = (SKILL_BASE_DIR / "SKILL.md").read_text(encoding="utf-8") if (SKILL_BASE_DIR / "SKILL.md").exists() else ""
    reference = (
        (SKILL_BASE_DIR / "references" / "cpu_alert_sop.md").read_text(encoding="utf-8")
        if (SKILL_BASE_DIR / "references" / "cpu_alert_sop.md").exists()
        else ""
    )

    prompt = {
        "skill": "cpu_alert_mvp",
        "skill_spec": skill_spec,
        "reference": reference,
        "input": {
            "target": fetched.target_name,
            "scenario": fetched.scenario,
            "classifier": fetched.classifier,
            "confidence": fetched.confidence,
            "latest_data_count": len(fetched.latest_data),
            "time_series_count": len(fetched.metric_time_series),
            "incident_count": len(fetched.incidents),
            "event_count": len(fetched.events),
            "incidents": fetched.incidents[:5],
            "events": fetched.events[:5],
        },
        "output_schema": {
            "conclusion": "string",
            "evidence": "string",
            "sop": "string",
            "next_step": "string",
        },
    }

    payload = {
        "model": model,
        "temperature": 0.1,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是OEM运维Skill执行器。严格遵循输入skill_spec与reference。"
                    "只返回JSON，不要额外解释。"
                ),
            },
            {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
        ],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=20) as client:
            resp = client.post(endpoint, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
        content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
        parsed = json.loads(content)
        if not isinstance(parsed, dict):
            return None
        for k in ("conclusion", "evidence", "sop", "next_step"):
            if k not in parsed:
                return None
        template = _load_template()
        return template.format(
            target=fetched.target_name or "未指定目标",
            conclusion=str(parsed["conclusion"]).strip(),
            evidence=str(parsed["evidence"]).strip(),
            sop=str(parsed["sop"]).strip(),
            next_step=str(parsed["next_step"]).strip(),
        )
    except Exception:
        return None
