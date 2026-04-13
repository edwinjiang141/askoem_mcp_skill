"""oracle_health_tools：脚本工具分块与跨块（无 LLM）。"""
from __future__ import annotations

from src.oracle_health_tools import (
    run_health_analysis_tools,
    tool_analyze_section_block,
    tool_cross_block_compare,
    tool_oem_console_entry_url,
)


def test_tool_oem_console_entry_url() -> None:
    assert "https://oem.example.com/em" == tool_oem_console_entry_url("https://oem.example.com/")
    assert "未配置" in tool_oem_console_entry_url("")


def test_tool_analyze_insufficient() -> None:
    r = tool_analyze_section_block("cpu", "CPU", [{"VALUE": "1.0", "_health_section": "cpu"}])
    assert r["pattern"] == "insufficient_data"


def test_tool_analyze_spike() -> None:
    rows = [
        {"VALUE": "10", "_health_section": "cpu"},
        {"VALUE": "50", "_health_section": "cpu"},
        {"VALUE": "12", "_health_section": "cpu"},
    ]
    r = tool_analyze_section_block("cpu", "CPU", rows)
    assert r["pattern"] in ("spike", "flat", "sustained_high", "insufficient_data")


def test_cross_block() -> None:
    sections = [
        {"section_key": "io", "pattern": "spike"},
        {"section_key": "wait", "pattern": "spike"},
    ]
    c = tool_cross_block_compare(sections)
    assert c["io_wait_alignment"] == "both_stressed"


def test_run_health_analysis_tools() -> None:
    subs = [
        {
            "sub_question": "IO（io）",
            "latest_data": [
                {"VALUE": "1", "_health_section": "io"},
                {"VALUE": "2", "_health_section": "io"},
            ],
        },
        {
            "sub_question": "等待（wait）",
            "latest_data": [
                {"VALUE": "3", "_health_section": "wait"},
                {"VALUE": "4", "_health_section": "wait"},
            ],
        },
    ]
    out = run_health_analysis_tools(subs, "https://x/")
    assert "sections" in out and len(out["sections"]) == 2
    assert out["oem_console_entry_url"].endswith("/em")
    assert "cross_block" in out
