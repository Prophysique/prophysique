# Legacy `fish_audio_sdk` API (`Session`)

The `fish-audio-sdk` package ships **two** Python interfaces:

1. The modern `fishaudio` client (`from fishaudio import FishAudio`) — covered
   in the main `SKILL.md`. Prefer this for new code.
2. The legacy `fish_audio_sdk` module (`from fish_audio_sdk import Session`) —
   documented here. It still works and is not removed, so use it when reading
   or maintaining existing code that already imports it.

Both talk to the same `https://api.fish.audio` backend.

## Setup

```python
from fish_audio_sdk import Session, TTSRequest, ReferenceAudio

session = Session("your_api_key")  # positional API key
```

## Text-to-speech

`session.tts(request, backend=...)` returns a generator of audio-byte chunks.
`backend` selects the model: `speech-1.5` (default), `speech-1.6`, `agent-x0`,
`s1`, `s1-mini`, `s2-pro`.

```python
with open("output.mp3", "wb") as f:
    for chunk in session.tts(
        TTSRequest(text="Hello, world!"),
        backend="s2-pro",
    ):
        f.write(chunk)
```

`TTSRequest` fields: `text`, `chunk_length` (100–300, default 200), `format`
(`wav`/`pcm`/`mp3`, default `mp3`), `sample_rate`, `mp3_bitrate` (64/128/192),
`opus_bitrate`, `references` (list of `ReferenceAudio`), `reference_id`,
`normalize` (default True), `latency` (`normal`/`balanced`, default
`balanced`), `prosody` (`Prosody(speed=1.0, volume=0.0)`), `top_p` (0.7),
`temperature` (0.7).

### Voice cloning

```python
# On-the-fly with reference audio
with open("ref.wav", "rb") as ref:
    for chunk in session.tts(TTSRequest(
        text="Spoken in the cloned voice.",
        references=[ReferenceAudio(audio=ref.read(), text="Reference transcript.")],
    )):
        ...

# Or use a saved model id
session.tts(TTSRequest(text="...", reference_id="<model_id>"))
```

## Speech-to-text

```python
from fish_audio_sdk import ASRRequest

with open("audio.mp3", "rb") as f:
    resp = session.asr(ASRRequest(audio=f.read(), language="en"))

print(resp.text, resp.duration)
for seg in resp.segments:      # each: .text, .start, .end
    print(seg.start, seg.end, seg.text)
```

## Voice models

```python
# Create / clone
with open("sample.wav", "rb") as f:
    model = session.create_model(
        title="My Voice",
        voices=[f.read()],           # list of sample bytes
        description="Custom clone",
        visibility="private",         # public | unlist | private
        train_mode="fast",
        tags=["custom"],
    )
model_id = model.id                   # use as reference_id later

# List (paginated, filterable)
page = session.list_models(page_size=10, page_number=1, self_only=True,
                           sort_by="task_count")  # page.total, page.items

session.get_model(model_id)                         # -> ModelEntity
session.update_model(model_id, title="New title")   # PATCH fields
session.delete_model(model_id)
```

`ModelEntity` exposes `id`, `type`, `title`, `description`, `state`
(`created`/`training`/`trained`/`failed`), `train_mode`, `tags`, `samples`,
`languages`, `visibility`, timestamps, and author info.

## Account

```python
session.get_api_credit()   # -> APICreditEntity(.credit, ...)
session.get_package()       # -> PackageEntity(.balance, .total, ...)
```

## Real-time WebSocket

```python
from fish_audio_sdk import WebSocketSession, TTSRequest

ws = WebSocketSession("your_api_key")

def text_stream():
    yield "Hello, "
    yield "streaming world!"

with open("output.mp3", "wb") as f:
    for chunk in ws.tts(TTSRequest(text=""), text_stream(), backend="s2-pro"):
        f.write(chunk)
```

`AsyncWebSocketSession` is the awaitable equivalent for async code.

## Migration

To move legacy code to the modern client, see the migration guide at
https://docs.fish.audio/archive/python-sdk-legacy/migration-guide — the API
concepts (reference ids, reference audio, backends/models) map directly.
