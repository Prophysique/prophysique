---
name: fish-audio
description: >-
  Generate speech, clone voices, and transcribe audio with the Fish Audio API.
  Use this whenever the task involves text-to-speech (TTS), voice cloning /
  voice models, speech synthesis, narration, or speech-to-text (ASR /
  transcription) AND Fish Audio is the provider — e.g. "read this post aloud
  with Fish Audio", "clone my voice", "turn this article into an MP3", "call
  api.fish.audio", "use the fish-audio-sdk", or any code that imports
  `fishaudio` / `fish_audio_sdk` or hits `api.fish.audio`. Reach for it even
  when the user only says "generate a voiceover" or "make an audio version" and
  Fish Audio is the configured voice service, so you use the correct SDK,
  endpoints, and parameters instead of guessing.
---

# Fish Audio

Fish Audio is a voice-AI platform with a REST API (base URL
`https://api.fish.audio`) and official SDKs. It does three things:

- **Text-to-speech (TTS)** — synthesize natural speech, optionally with a
  chosen or cloned voice.
- **Voice cloning** — build a reusable voice model from a short reference
  sample (~10–30s), or clone on-the-fly by attaching reference audio to a
  single request.
- **Speech-to-text (ASR)** — transcribe audio, with per-segment timestamps.

The same "generate speech with voice X" call works whether X is a catalog
voice or one you cloned — you just pass its id as `reference_id`.

## Authentication

Every request needs an API key from **https://fish.audio/app/api-keys**.

- REST: send header `Authorization: Bearer $FISH_API_KEY`.
- SDK: reads the `FISH_API_KEY` environment variable, or pass
  `api_key="..."` to the client.

Prefer the environment variable. Never hard-code a key into committed files.

## Which interface to use

- **Python** → use the official SDK (`pip install fish-audio-sdk`). It's the
  smoothest path and covers everything below. Details in this file.
- **Any other language, or you need raw control** → call the REST API
  directly. See `references/http-api.md` for endpoints, the msgpack/JSON
  request bodies, and `curl` + JavaScript examples.
- **Maintaining older code** that imports `from fish_audio_sdk import Session,
  TTSRequest` → that legacy API still ships in the same package. See
  `references/legacy-sdk.md`.

## Python quick start

```bash
pip install fish-audio-sdk        # SDK
pip install "fish-audio-sdk[utils]"  # + play()/save() audio helpers
export FISH_API_KEY="your_api_key_here"
```

```python
from fishaudio import FishAudio
from fishaudio.utils import save

client = FishAudio()  # reads FISH_API_KEY; or FishAudio(api_key="...")

audio = client.tts.convert(text="Hello from Fish Audio!")  # -> bytes
save(audio, "output.mp3")
```

`convert()` returns the full audio as `bytes`. Use `save(audio, path)` to write
a file and `play(audio)` to play it (both from `fishaudio.utils`, requiring the
`[utils]` extra). There's also an async client: `from fishaudio import
AsyncFishAudio` — same methods, `await` them.

### Resource clients

| Client            | Purpose            | Key methods                              |
| ----------------- | ------------------ | ---------------------------------------- |
| `client.tts`      | Text-to-speech     | `convert()`, `stream()`, `stream_websocket()` |
| `client.asr`      | Speech recognition | `transcribe()`                           |
| `client.voices`   | Voice models       | `list()`, `get()`, `create()`, `update()`, `delete()` |
| `client.account`  | Account/billing    | `get_credits()`, `get_package()`         |

## Text-to-speech

`client.tts.convert()` accepts these keyword arguments (all optional except
`text`):

- `text` — the text to speak.
- `reference_id` — id of a voice model (catalog or cloned) to speak in.
- `references` — list of `ReferenceAudio` for instant, on-the-fly cloning
  (see below).
- `format` — `"mp3"` (default), `"wav"`, `"pcm"`, or `"opus"`.
- `latency` — `"balanced"` (default, faster) or `"normal"` (higher quality).
- `speed` — speech-speed multiplier, e.g. `1.5`. Range 0.5–2.0.
- `model` — `"s2-pro"` (default) or `"s1"`. `"speech-1.5"`/`"speech-1.6"` still
  work but are deprecated — prefer `s2-pro` or `s1`.
- `config` — a reusable `TTSConfig` (below) for finer control.

```python
# Speak in a specific voice, faster, as a WAV file
audio = client.tts.convert(
    text="Consistency beats intensity.",
    reference_id="802e3bc2b27e49c2995d23ef70e6ac89",
    speed=1.2,
    format="wav",
)
```

### Reusable configuration (`TTSConfig`)

When you generate many clips with the same settings, build a `TTSConfig` once
and pass it via `config=`. Explicit `convert()` keyword args override the
matching config field.

```python
from fishaudio.types import TTSConfig, Prosody

config = TTSConfig(
    reference_id="933563129e564b19a115bedd57b7406a",
    prosody=Prosody(speed=1.1, volume=-3.0),  # speed 0.5–2.0, volume -20..20 dB
    format="mp3",
    mp3_bitrate=192,           # 64 | 128 | 192
    latency="balanced",
    temperature=0.7,           # 0.0–1.0, lower = more consistent
    top_p=0.7,                 # 0.0–1.0
    chunk_length=200,          # 100–300 chars per generation chunk
)

audio = client.tts.convert(text="First clip", config=config)
```

### Streaming audio chunks

For long text or to start playback/upload before generation finishes, use
`stream()` — it yields audio chunks as they're produced.

```python
# Process chunks as they arrive
for chunk in client.tts.stream(text="A long article..."):
    upload(chunk)

# Or gather everything into one bytes object
audio = client.tts.stream(text="Hello!").collect()
```

### Real-time streaming (WebSocket)

When the *text itself* arrives incrementally (e.g. token-by-token from an LLM),
feed an iterator of text to `stream_websocket()` and get audio back live —
ideal for conversational agents.

```python
def text_chunks():
    yield "Hello, "
    yield "this is "
    yield "streaming!"

audio_stream = client.tts.stream_websocket(text_chunks(), latency="balanced")
play(audio_stream)  # from fishaudio.utils
```

The async client's `stream_websocket()` takes an async generator and is
awaited. See `references/http-api.md` for the raw WebSocket protocol.

## Voice cloning

Two ways to clone, depending on whether you'll reuse the voice.

### Instant cloning (single request)

Attach one or more reference samples to a `convert()` call. Nothing is stored
server-side. Give the transcript in `text` so prosody matches — include
punctuation.

```python
from fishaudio.types import ReferenceAudio

with open("reference.wav", "rb") as f:
    audio = client.tts.convert(
        text="This sentence is spoken in the cloned voice.",
        references=[ReferenceAudio(
            audio=f.read(),
            text="Exact transcript of what is said in reference.wav.",
        )],
    )
```

### Persistent voice models (reuse across requests)

Create a model once, then pass its `id` as `reference_id` forever after.

```python
with open("voice_sample.wav", "rb") as f:
    voice = client.voices.create(
        title="My Voice",
        voices=[f.read()],          # one or more sample files (bytes)
        description="Custom clone",
        tags=["custom", "english"],
        visibility="private",       # "private" | "unlist" | "public"
    )

print("Voice id:", voice.id)

audio = client.tts.convert(text="Using my saved voice", reference_id=voice.id)
```

Manage voices with `client.voices.list(...)` (paginated, filter by `title`,
`tags`, `self_only=True`, etc.), `.get(voice_id)`, `.update(voice_id, ...)`,
and `.delete(voice_id)`.

## Speech-to-text (ASR)

```python
with open("audio.mp3", "rb") as f:
    result = client.asr.transcribe(audio=f.read(), language="en")

print(result.text)
print(result.duration, "seconds")
for seg in result.segments:
    print(f"[{seg.start:.2f}s–{seg.end:.2f}s] {seg.text}")
```

`language` is optional (auto-detected if omitted, e.g. `"en"`, `"zh"`). Set
`include_timestamps=False` to skip segment timing.

## Account / credits

```python
credits = client.account.get_credits()   # remaining API credit
package  = client.account.get_package()   # plan balance/total
```

## Error handling

```python
from fishaudio.exceptions import (
    AuthenticationError,  # bad/missing API key
    RateLimitError,       # too many requests
    ValidationError,      # malformed request
    NotFoundError,        # e.g. unknown voice id
    FishAudioError,       # base class for all of the above
)

try:
    audio = client.tts.convert(text="Hello!")
except AuthenticationError:
    ...  # check FISH_API_KEY
except RateLimitError:
    ...  # back off and retry
except FishAudioError as e:
    ...  # any other API error
```

## Practical notes

- **Cost/credits are real.** These are billed API calls. Don't fire off large
  batches or long transcriptions without the user's intent being clear.
- **Reference transcripts matter.** For cloning, the `text` accompanying a
  reference sample should match the audio exactly, punctuation included — it
  drives prosody quality.
- **Pick the model deliberately.** `s2-pro` is the current default and highest
  quality; `s1` is a lighter option. Avoid the deprecated `speech-1.x` models
  for new work.
- **Handle audio as bytes.** TTS returns raw audio bytes in the requested
  `format`; name output files with a matching extension (`.mp3`, `.wav`, …).
- **Verify the docs when unsure.** The authoritative reference is
  https://docs.fish.audio. This skill captures the SDK/REST surface as of the
  `fish-audio-sdk` 1.x release.
