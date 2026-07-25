#!/usr/bin/env python3
"""Create a voice clone with Fish Audio and save it as the project's default voice.

Fish Audio builds a voice model from *audio* of the target speaker. A text
transcript alone is not enough — you must pass one or more real recordings.

Usage:
    export FISH_API_KEY="your_fish_audio_api_key"
    python voice/clone_voice.py path/to/recording.mp3 --title "Carlos" --default

The created model's id is written to voice/voice-config.json. When --default is
passed (the default behaviour), that model becomes the project's default voice,
which voice/synthesize.py then uses for text-to-speech.

Docs: https://docs.fish.audio/  (POST https://api.fish.audio/model)
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _env import load_env_file  # noqa: E402

load_env_file()

API_BASE = os.environ.get("FISH_API_BASE", "https://api.fish.audio")
CONFIG_PATH = Path(__file__).with_name("voice-config.json")

# Fish Audio accepts a handful of common audio containers for cloning.
SUPPORTED_SUFFIXES = {".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac", ".opus"}


def _require_api_key() -> str:
    key = os.environ.get("FISH_API_KEY")
    if not key:
        sys.exit(
            "Error: FISH_API_KEY is not set. Get a key from https://fish.audio "
            "and export it:\n    export FISH_API_KEY=your_key"
        )
    return key


def _validate_audio(paths: list[str]) -> list[Path]:
    resolved: list[Path] = []
    for p in paths:
        path = Path(p).expanduser()
        if not path.is_file():
            sys.exit(f"Error: audio file not found: {path}")
        if path.suffix.lower() not in SUPPORTED_SUFFIXES:
            sys.exit(
                f"Error: unsupported audio type '{path.suffix}'. "
                f"Supported: {', '.join(sorted(SUPPORTED_SUFFIXES))}"
            )
        resolved.append(path)
    if not resolved:
        sys.exit("Error: provide at least one audio file to clone from.")
    return resolved


def create_voice_clone(
    audio_paths: list[Path],
    title: str,
    api_key: str,
    *,
    description: str = "",
    reference_text: str = "",
    visibility: str = "private",
) -> dict:
    """Upload audio to Fish Audio and return the created model as a dict."""
    url = f"{API_BASE}/model"
    headers = {"Authorization": f"Bearer {api_key}"}

    # multipart/form-data: repeated `voices` parts carry the audio bytes.
    files = []
    open_handles = []
    try:
        for path in audio_paths:
            fh = path.open("rb")
            open_handles.append(fh)
            mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
            files.append(("voices", (path.name, fh, mime)))

        data = {
            "title": title,
            "type": "tts",
            "train_mode": "fast",
            "visibility": visibility,
        }
        if description:
            data["description"] = description
        if reference_text:
            # Improves clone fidelity when it matches the recording's speech.
            data["texts"] = reference_text

        resp = requests.post(url, headers=headers, data=data, files=files, timeout=300)
    finally:
        for fh in open_handles:
            fh.close()

    if resp.status_code >= 400:
        sys.exit(
            f"Fish Audio API error ({resp.status_code}): {resp.text}\n"
            "Check your FISH_API_KEY and that the audio is valid speech."
        )

    model = resp.json()
    model_id = model.get("_id") or model.get("id")
    if not model_id:
        sys.exit(f"Unexpected API response, no model id found:\n{json.dumps(model, indent=2)}")
    return model


def save_config(model: dict, title: str, *, make_default: bool) -> None:
    model_id = model.get("_id") or model.get("id")
    config = {"voices": {}, "default_voice": None}
    if CONFIG_PATH.exists():
        config = json.loads(CONFIG_PATH.read_text())
        config.setdefault("voices", {})
        config.setdefault("default_voice", None)

    config["voices"][model_id] = {
        "title": title,
        "model_id": model_id,
        "provider": "fish-audio",
    }
    if make_default or config["default_voice"] is None:
        config["default_voice"] = model_id

    CONFIG_PATH.write_text(json.dumps(config, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Clone a voice with Fish Audio.")
    parser.add_argument("audio", nargs="+", help="Path(s) to audio recording(s) of the voice.")
    parser.add_argument("--title", required=True, help="Name for the voice, e.g. 'Carlos'.")
    parser.add_argument("--description", default="", help="Optional description.")
    parser.add_argument(
        "--reference-text",
        default="",
        help="Transcript of the recording (optional; improves fidelity).",
    )
    parser.add_argument(
        "--visibility",
        choices=["private", "unlist", "public"],
        default="private",
        help="Model visibility on Fish Audio (default: private).",
    )
    parser.add_argument(
        "--default",
        dest="make_default",
        action="store_true",
        default=True,
        help="Set this voice as the project default (default: on).",
    )
    parser.add_argument(
        "--no-default",
        dest="make_default",
        action="store_false",
        help="Do not change the project default voice.",
    )
    args = parser.parse_args()

    api_key = _require_api_key()
    audio_paths = _validate_audio(args.audio)

    print(f"Uploading {len(audio_paths)} file(s) to Fish Audio to clone '{args.title}'...")
    model = create_voice_clone(
        audio_paths,
        args.title,
        api_key,
        description=args.description,
        reference_text=args.reference_text,
        visibility=args.visibility,
    )
    model_id = model.get("_id") or model.get("id")
    save_config(model, args.title, make_default=args.make_default)

    print(f"✓ Voice clone created. model_id = {model_id}")
    if args.make_default:
        print(f"✓ Set as default voice in {CONFIG_PATH.name}")
    print("Next: python voice/synthesize.py \"Hello, this is my cloned voice.\" out.mp3")


if __name__ == "__main__":
    main()
