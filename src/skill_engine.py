from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

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
