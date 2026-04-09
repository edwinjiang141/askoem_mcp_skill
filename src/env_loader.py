from __future__ import annotations

import os
from pathlib import Path


def load_env_from_file(env_path: str = ".env") -> None:
    """
    从项目根目录 .env 文件加载环境变量（轻量实现，无第三方依赖）。
    - 仅在变量尚未存在于进程环境时写入，避免覆盖运行时注入值。
    - 支持 `KEY=VALUE` 基础格式与注释行。
    """
    path = Path(env_path)
    if not path.exists():
        return
    try:
        content = path.read_text(encoding="utf-8")
    except Exception:
        return

    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value

