# Voice cloning (Fish Audio)

Clone a voice with [Fish Audio](https://fish.audio) and reuse it as the
project's default voice for text-to-speech.

## Important: cloning needs *audio*, not a transcript

A voice clone is built from the **sound** of the speaker — one or more real
recordings (`.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`, `.aac`, `.opus`). A text
transcript of what was said is **not** enough on its own; at most it can be
passed as `--reference-text` to help alignment. You must supply the actual
audio file.

## Setup

```bash
pip install -r voice/requirements.txt
export FISH_API_KEY="your_fish_audio_api_key"   # from https://fish.audio
```

## Clone a voice and make it the default

```bash
python voice/clone_voice.py path/to/recording.mp3 --title "Carlos"
```

You can pass several recordings for a better clone:

```bash
python voice/clone_voice.py take1.mp3 take2.wav --title "Carlos" \
    --reference-text "Hi, this is Carlos, just talking to create a voice clone..."
```

The created model id is stored in [`voice-config.json`](voice-config.json) and,
unless you pass `--no-default`, set as `default_voice`.

## Generate speech in the cloned voice

```bash
python voice/synthesize.py "Hello, this is my cloned voice." out.mp3
```

It uses `default_voice` from `voice-config.json`; override with
`--voice <model_id>`.

## Notes

- `FISH_API_KEY` is read from the environment and never written to disk.
- Clones default to `private` visibility on Fish Audio (`--visibility` to change).
- Only clone voices you have the right to clone.
