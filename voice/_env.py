"""Minimal .env loader (no third-party dependency).

Loads KEY=VALUE pairs from voice/.env into the process environment so the
scripts can read FISH_API_KEY without it being passed on the command line.
Existing environment variables take precedence (setdefault), so an explicit
`export FISH_API_KEY=...` always wins over the file.
"""
from __future__ import annotations

import os
from pathlib import Path


def load_env_file(path: str | Path | None = None) -> None:
    env_path = Path(path) if path else Path(__file__).with_name(".env")
    if not env_path.is_file():
        return
    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key.strip(), value)
