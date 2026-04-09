#!/usr/bin/env python3
from __future__ import annotations

import argparse


def compose_question(target: str, time_range: str = "最近24小时") -> str:
    return f"{target} 在{time_range}出现 CPU 高告警，请给出诊断与处理建议。"


def main() -> None:
    parser = argparse.ArgumentParser(description="CPU 告警 Skill 提问拼接脚本（MVP）")
    parser.add_argument("--target", required=True, help="目标名，例如 host01")
    parser.add_argument("--time-range", default="最近24小时", help="时间范围")
    args = parser.parse_args()
    print(compose_question(args.target, args.time_range))


if __name__ == "__main__":
    main()

