# Fish Audio REST API reference

Use this when you're not in Python, or need control the SDK doesn't expose.

- **Base URL:** `https://api.fish.audio`
- **Auth:** header `Authorization: Bearer $FISH_API_KEY` on every request.
- **Bodies:** TTS and ASR accept either JSON (`Content-Type: application/json`)
  or MessagePack (`Content-Type: application/msgpack`). The official SDK uses
  msgpack; JSON is simpler for `curl`/other languages. Voice-model creation
  uses `multipart/form-data`.

## Endpoints

| Method | Path                         | Purpose                                  |
| ------ | ---------------------------- | ---------------------------------------- |
| POST   | `/v1/tts`                    | Text-to-speech. Returns audio bytes.     |
| POST   | `/v1/asr`                    | Speech-to-text. Returns JSON transcript. |
| GET    | `/model`                     | List voice models (paginated).           |
| GET    | `/model/{model_id}`          | Get one voice model.                      |
| POST   | `/model`                     | Create/clone a voice model (multipart).  |
| PATCH  | `/model/{model_id}`          | Update a voice model.                     |
| DELETE | `/model/{model_id}`          | Delete a voice model.                     |
| GET    | `/wallet/self/api-credit`    | Remaining API credit.                    |
| GET    | `/wallet/self/package`       | Plan balance/total.                      |

The TTS model (backend) is selected with a `model` **request header**:
`speech-1.5`, `speech-1.6`, `agent-x0`, `s1`, `s1-mini`, or `s2-pro`.
Prefer `s2-pro` (default) or `s1`; `speech-1.x` are deprecated.

## Text-to-speech — `POST /v1/tts`

Request body fields (JSON or msgpack):

| Field                          | Type / values                                  | Default      |
| ------------------------------ | ---------------------------------------------- | ------------ |
| `text`                         | string (required)                              | —            |
| `reference_id`                 | string — voice-model id                        | null         |
| `references`                   | list of `{audio: bytes, text: string}`         | `[]`         |
| `format`                       | `"mp3"` \| `"wav"` \| `"pcm"`                   | `"mp3"`      |
| `mp3_bitrate`                  | `64` \| `128` \| `192`                          | `128`        |
| `opus_bitrate`                 | `-1000` \| `24` \| `32` \| `48` \| `64`         | `32`         |
| `sample_rate`                  | int or null                                    | null         |
| `chunk_length`                 | int 100–300                                     | `200`        |
| `normalize`                    | bool (clean/normalize input text)              | `true`       |
| `latency`                      | `"normal"` \| `"balanced"`                      | `"balanced"` |
| `prosody`                      | `{speed: 0.5–2.0, volume: -20..20}`             | null         |
| `top_p`                        | float 0.0–1.0                                   | `0.7`        |
| `temperature`                  | float 0.0–1.0                                   | `0.7`        |

The response body is the raw audio stream in the requested `format`.

### curl (JSON)

```bash
curl -X POST https://api.fish.audio/v1/tts \
  -H "Authorization: Bearer $FISH_API_KEY" \
  -H "Content-Type: application/json" \
  -H "model: s2-pro" \
  -d '{
        "text": "Hello from the REST API.",
        "reference_id": "802e3bc2b27e49c2995d23ef70e6ac89",
        "format": "mp3"
      }' \
  --output output.mp3
```

### JavaScript / TypeScript (fetch)

There is also an official npm package (`fish-audio`); this raw example uses
`fetch` so it works anywhere:

```javascript
const res = await fetch("https://api.fish.audio/v1/tts", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.FISH_API_KEY}`,
    "Content-Type": "application/json",
    model: "s2-pro",
  },
  body: JSON.stringify({ text: "Hello!", format: "mp3" }),
});
const audio = Buffer.from(await res.arrayBuffer());
require("fs").writeFileSync("output.mp3", audio);
```

## Speech-to-text — `POST /v1/asr`

Request body:

| Field               | Type / values                        | Default |
| ------------------- | ------------------------------------ | ------- |
| `audio`             | audio file bytes (required)          | —       |
| `language`          | string, e.g. `"en"` (auto if null)   | null    |
| `ignore_timestamps` | bool — set true to skip segment times| false   |

Response JSON:

```json
{
  "text": "full transcript",
  "duration": 12.34,
  "segments": [{ "text": "...", "start": 0.0, "end": 2.1 }]
}
```

Because `audio` is binary, msgpack is the natural encoding here (what the SDK
uses). To send from `curl`, base64/msgpack tooling is easier via a small
script, or use the SDK.

## Create voice model — `POST /model` (multipart/form-data)

Form fields:

- `type` — `tts`
- `title` — model name (required)
- `voices` — one or more audio files; repeat the field for multiple samples
- `visibility` — `private` (default) | `unlist` | `public`
- `train_mode` — `fast`
- `description` — optional
- `texts` — optional transcripts for the samples
- `tags` — optional
- `enhance_audio_quality` — bool, default true
- `cover_image` — optional image file

Response is the created model object; use its `_id` as `reference_id` in
subsequent `/v1/tts` calls.

```bash
curl -X POST https://api.fish.audio/model \
  -H "Authorization: Bearer $FISH_API_KEY" \
  -F "type=tts" \
  -F "title=My Voice" \
  -F "train_mode=fast" \
  -F "visibility=private" \
  -F "voices=@sample1.wav" \
  -F "voices=@sample2.wav"
```

## List / get / update / delete models

- `GET /model` — query params: `page_size`, `page_number`, `title`, `tag`,
  `self` (bool, your own only), `author_id`, `language`, `title_language`,
  `sort_by` (`task_count` | `created_at`). Returns `{ total, items }`.
- `GET /model/{id}` — one model.
- `PATCH /model/{id}` — multipart form with any of `title`, `description`,
  `visibility`, `tags`, `cover_image`.
- `DELETE /model/{id}` — remove a model.

## WebSocket streaming

The SDK's `stream_websocket()` connects to Fish Audio over a WebSocket at the
same host (`https://api.fish.audio`) and exchanges MessagePack events:

- `start` — `{ event: "start", request: <TTSRequest without text> }`
- `text` — `{ event: "text", text: "<incremental text>" }` (send repeatedly)
- `stop` / close — `{ event: "stop" }` to finish

The server streams audio-byte frames back as text is sent. For non-Python
clients, mirror this event sequence. If you need exact framing details, consult
https://docs.fish.audio — the Python SDK (`fishaudio.resources.realtime`,
`fish_audio_sdk.websocket`) is the reference implementation.
