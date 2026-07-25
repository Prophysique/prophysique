#!/usr/bin/env python3
"""Synthesize speech with Fish Audio using the project's default cloned voice.

Usage:
    export FISH_API_KEY="your_fish_audio_api_key"
    python voice/synthesize.py "Text to speak" output.mp3
    python voice/synthesize.py "Text" output.mp3 --voice <model_id>

Reads the default voice from voice/voice-config.json (written by clone_voice.py).

Docs: https://docs.fish.audio/  (POST https://api.fish.audio/v1/tts)
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import requests

API_BASE = os.environ.get("FISH_API_BASE", "https://api.fish.audio")
CONFIG_PATH = Path(__file__).with_name("voice-config.json")


def _require_api_key() -> str:
    key = os.environ.get("FISH_API_KEY")
    if not key:
        sys.exit("Error: FISH_API_KEY is not set. export FISH_API_KEY=your_key")
    return key


def _resolve_voice(explicit: str | None) -> str:
    if explicit:
        return explicit
    if not CONFIG_PATH.exists():
        sys.exit(
            f"Error: no voice configured. Run voice/clone_voice.py first, "
            f"or pass --voice <model_id>."
        )
    config = json.loads(CONFIG_PATH.read_text())
    default = config.get("default_voice")
    if not default:
        sys.exit("Error: no default_voice set in voice-config.json. Pass --voice <model_id>.")
    return default


def synthesize(text: str, voice_id: str, api_key: str, out_path: Path, audio_format: str) -> None:
    url = f"{API_BASE}/v1/tts"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"text": text, "reference_id": voice_id, "format": audio_format}

    resp = requests.post(url, headers=headers, json=payload, timeout=300, stream=True)
    if resp.status_code >= 400:
        sys.exit(f"Fish Audio API error ({resp.status_code}): {resp.text}")

    out_path.write_bytes(resp.content)


def main() -> None:
    parser = argparse.ArgumentParser(description="Text-to-speech via Fish Audio.")
    parser.add_argument("text", help="Text to synthesize.")
    parser.add_argument("output", help="Output audio path, e.g. out.mp3")
    parser.add_argument("--voice", default=None, help="Model id (defaults to project default voice).")
    parser.add_argument("--format", default="mp3", choices=["mp3", "wav", "pcm", "opus"])
    args = parser.parse_args()

    api_key = _require_api_key()
    voice_id = _resolve_voice(args.voice)
    out_path = Path(args.output).expanduser()

    print(f"Synthesizing with voice {voice_id}...")
    synthesize(args.text, voice_id, api_key, out_path, args.format)
    print(f"✓ Wrote {out_path}")


if __name__ == "__main__":
    main()
