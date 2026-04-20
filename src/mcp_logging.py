"""
MCP 服务日志：同时写入仓库 logs/mcp_server.log 与进程 stderr（stdio MCP 下终端可见 stderr）。

环境变量：
- ASKOEM_LOG_LEVEL：DEBUG | INFO | WARNING（默认 INFO）；DEBUG 时 skill_workflow 会打印完整 SQL 行
- ASKOEM_MCP_LOG_FILE：日志文件绝对或相对路径；未设则使用 <repo>/logs/mcp_server.log
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

_configured = False


def setup_mcp_logging(repo_root: Path) -> Path:
    """
    配置 askoem 命名空间日志（幂等）。返回实际使用的日志文件路径。
    """
    global _configured
    log_path_str = (os.getenv("ASKOEM_MCP_LOG_FILE") or "").strip()
    log_path = Path(log_path_str) if log_path_str else (repo_root / "logs" / "mcp_server.log")
    if not log_path.is_absolute():
        log_path = (repo_root / log_path).resolve()

    level_name = (os.getenv("ASKOEM_LOG_LEVEL") or "INFO").strip().upper()
    level = getattr(logging, level_name, logging.INFO)

    log = logging.getLogger("askoem")
    log.setLevel(level)

    if not _configured:
        _configured = True
        log_path.parent.mkdir(parents=True, exist_ok=True)
        fmt = logging.Formatter(
            "%(asctime)s %(levelname)s [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        fh = logging.FileHandler(log_path, encoding="utf-8")
        fh.setFormatter(fmt)
        sh = logging.StreamHandler(sys.stderr)
        sh.setFormatter(fmt)
        log.addHandler(fh)
        log.addHandler(sh)
        log.propagate = False

    return log_path
