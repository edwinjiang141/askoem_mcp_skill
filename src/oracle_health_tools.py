"""
Oracle 快速健康检查：SKILL 预置工具（纯脚本），完成分块统计、形态标记与跨块对照。
LLM 仅消费本模块输出的结构化结果生成最终四段正文，不从原始行重算尖峰或对照关系。
"""
from __future__ import annotations

import math
import re
import statistics
from typing import Any, Optional

_SECTION_KEY_RE = re.compile(r"[（(](\w+)[）)]")


def _parse_cell_float(raw: Any) -> Optional[float]:
    if raw is None:
        return None
    s = str(raw).strip().replace(",", "")
    if s == "" or s == "-":
        return None
    if s.endswith("%"):
        s = s[:-1].strip()
    try:
        return float(s)
    except ValueError:
        return None


def _row_numeric_value(row: dict[str, Any]) -> Optional[float]:
    for k in ("VALUE", "value", "metric_value"):
        if k in row:
            return _parse_cell_float(row.get(k))
    for key in row:
        if key.startswith("_"):
            continue
        if key.upper() in ("TARGET_NAME", "TARGET_TYPE", "METRIC_NAME", "METRIC_COLUMN", "COLUMN_LABEL"):
            continue
        if "time" in key.lower() or "timestamp" in key.lower():
            continue
        v = _parse_cell_float(row.get(key))
        if v is not None:
            return v
    return None


def _infer_section_key(sub_question: str, rows: list[dict[str, Any]]) -> str:
    for r in rows:
        k = r.get("_health_section")
        if isinstance(k, str) and k:
            return k
    m = _SECTION_KEY_RE.search(sub_question or "")
    if m:
        return m.group(1).lower()
    return "unknown"


def tool_analyze_section_block(section_key: str, sub_question: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    """
    工具：单维度块内数值序列的形态（尖峰 / 持续高位 / 相对平稳 / 数据不足）。
    输入：块键、子问题标签、该块 SQL 行。
    输出：结构化 dict（脚本结果，无 LLM）。
    """
    nums: list[float] = []
    for r in rows:
        v = _row_numeric_value(r)
        if v is not None:
            nums.append(v)
    n = len(nums)
    out: dict[str, Any] = {
        "section_key": section_key,
        "sub_question": sub_question,
        "row_count": len(rows),
        "numeric_sample_count": n,
    }
    if n < 2:
        out["pattern"] = "insufficient_data"
        out["pattern_detail"] = "可解析数值少于 2 个，无法判定形态。"
        return out

    mean_v = statistics.fmean(nums)
    min_v = min(nums)
    max_v = max(nums)
    span = max_v - min_v
    stdev = statistics.pstdev(nums) if n >= 2 else 0.0
    cv = (stdev / mean_v) if abs(mean_v) > 1e-9 else float("inf")
    out["stats"] = {
        "min": min_v,
        "max": max_v,
        "mean": mean_v,
        "stdev": stdev,
        "coefficient_of_variation": cv if math.isfinite(cv) else None,
    }

    # 规则：尖峰（波动大或 max 显著高于均值）；持续高位（整体高且 span 相对小）；否则相对平稳
    ratio_max_mean = max_v / mean_v if abs(mean_v) > 1e-9 else None
    relative_span = span / max(abs(max_v), 1e-9)

    if ratio_max_mean is not None and ratio_max_mean >= 1.45:
        out["pattern"] = "spike"
        out["pattern_detail"] = "max/mean 比值偏高，存在尖峰或短时冲高特征。"
    elif cv > 0.35 and n >= 3:
        out["pattern"] = "spike"
        out["pattern_detail"] = "变异系数偏高，序列波动明显。"
    elif mean_v > 0 and relative_span < 0.12:
        out["pattern"] = "sustained_high" if max_v > mean_v * 1.05 else "flat"
        out["pattern_detail"] = (
            "数值区间窄，整体维持在较高水平。" if out["pattern"] == "sustained_high" else "数值区间窄，相对平稳。"
        )
    else:
        out["pattern"] = "flat"
        out["pattern_detail"] = "未触发尖峰或持续高位规则，记为相对平稳或温和波动。"

    return out


def tool_cross_block_compare(section_results: list[dict[str, Any]]) -> dict[str, Any]:
    """
    工具：IO 块与 Wait 块的脚本级对照（同向异常 / 混合 / 数据不足）。
    """
    by_key = {str(s.get("section_key", "")).lower(): s for s in section_results}
    io = by_key.get("io")
    wait = by_key.get("wait")
    if not io or not wait:
        return {
            "io_wait_alignment": "insufficient",
            "notes": ["缺少 IO 或 Wait 维度的工具结果，跳过跨块对照。"],
        }
    spike_like = {"spike", "sustained_high"}

    def _stress(s: dict[str, Any]) -> bool:
        p = str(s.get("pattern", ""))
        return p in spike_like

    i_stress = _stress(io)
    w_stress = _stress(wait)
    if i_stress and w_stress:
        alignment = "both_stressed"
        notes = ["IO 与 Wait 均表现为偏高或波动显著，同向承压。"]
    elif not i_stress and not w_stress:
        alignment = "both_calm"
        notes = ["IO 与 Wait 均未触发偏高/尖峰规则，同向相对平稳。"]
    else:
        alignment = "mixed"
        notes = ["IO 与 Wait 形态不一致，需结合业务窗口与其它维度判断。"]

    return {
        "io_wait_alignment": alignment,
        "io_pattern": io.get("pattern"),
        "wait_pattern": wait.get("pattern"),
        "notes": notes,
    }


def tool_oem_console_entry_url(oem_base_url: str) -> str:
    """
    工具：MVP 深挖入口仅给出 OEM 企业管理器控制台入口 URL（由配置推导）。
    若未配置 base，返回明确提示字符串。
    """
    base = (oem_base_url or "").strip().rstrip("/")
    if not base:
        return (
            "未配置 OEM 控制台根地址：请在 config/metric_map.yaml 的 oem_api.default_base_url "
            "填写企业管理器 HTTPS 根地址（或设置环境变量由部署注入），然后使用 {根}/em 登录。"
        )
    return f"{base}/em"


def run_health_analysis_tools(omr_sub_queries: list[dict[str, Any]], oem_base_url: str) -> dict[str, Any]:
    """
    编排：对每个子查询块调用 tool_analyze_section_block，再调用 tool_cross_block_compare，
    最后生成 tool_oem_console_entry_url。
    """
    section_results: list[dict[str, Any]] = []
    for sub in omr_sub_queries:
        rows = sub.get("latest_data") or []
        sq = str(sub.get("sub_question", ""))
        sk = _infer_section_key(sq, rows)
        section_results.append(tool_analyze_section_block(sk, sq, rows))

    cross = tool_cross_block_compare(section_results)
    oem_url = tool_oem_console_entry_url(oem_base_url)

    return {
        "sections": section_results,
        "cross_block": cross,
        "oem_console_entry_url": oem_url,
    }
