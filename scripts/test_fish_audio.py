#!/usr/bin/env python3
"""Test connectivity and authentication against the Fish Audio API.

Reads the API key from the FISH_AUDIO_API_KEY environment variable so the
secret is never hardcoded. Hits a lightweight authenticated endpoint and
reports HTTP status, latency, and a clear pass/fail result.

Usage:
    export FISH_AUDIO_API_KEY=your_key_here
    python3 scripts/test_fish_audio.py

Exit codes:
    0  connection + auth succeeded
    1  request reached Fish Audio but auth/endpoint failed (e.g. 401/403)
    2  could not reach Fish Audio (network/proxy/DNS/TLS)
    3  misconfiguration (missing API key)
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE_URL = os.environ.get("FISH_AUDIO_BASE_URL", "https://api.fish.audio").rstrip("/")
# Lightweight authenticated endpoint: lists the caller's models.
ENDPOINT = "/model"
TIMEOUT_SECONDS = 15


def main() -> int:
    api_key = os.environ.get("FISH_AUDIO_API_KEY")
    if not api_key:
        print("FAIL: FISH_AUDIO_API_KEY is not set.", file=sys.stderr)
        print("      Set it first, e.g.:  export FISH_AUDIO_API_KEY=your_key",
              file=sys.stderr)
        return 3

    url = f"{BASE_URL}{ENDPOINT}?self=true&page_size=1"
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        },
        method="GET",
    )

    print(f"Testing Fish Audio connection -> GET {BASE_URL}{ENDPOINT}")
    started = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            elapsed = time.monotonic() - started
            status = response.status
            body = response.read(2048).decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        # Reached Fish Audio, but it returned a non-2xx status.
        elapsed = time.monotonic() - started
        detail = exc.read(512).decode("utf-8", errors="replace").strip()
        print(f"FAIL: HTTP {exc.code} after {elapsed:.2f}s", file=sys.stderr)
        if exc.code in (401, 403):
            print("      Authentication failed. Check that the API key is "
                  "valid and active.", file=sys.stderr)
        if detail:
            print(f"      Response: {detail}", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        # Never reached Fish Audio: DNS, TLS, proxy, or network failure.
        elapsed = time.monotonic() - started
        print(f"FAIL: could not reach {BASE_URL} after {elapsed:.2f}s",
              file=sys.stderr)
        print(f"      Reason: {exc.reason}", file=sys.stderr)
        print("      This is a network-layer failure (DNS/TLS/proxy/firewall), "
              "not an auth problem.", file=sys.stderr)
        return 2

    # Success: try to surface a friendly summary of the JSON payload.
    try:
        parsed = json.loads(body)
        total = parsed.get("total")
        summary = f" (models available: {total})" if total is not None else ""
    except (ValueError, AttributeError):
        summary = ""

    print(f"OK: HTTP {status} in {elapsed:.2f}s{summary}")
    print("Connection and authentication succeeded.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
