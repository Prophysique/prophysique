# Scripts

## `test_fish_audio.py`

Tests connectivity and authentication against the [Fish Audio](https://fish.audio) API.

Dependency-free (Python 3 standard library only). The API key is read from an
environment variable, never hardcoded.

### Usage

```bash
export FISH_AUDIO_API_KEY=your_key_here
python3 scripts/test_fish_audio.py
```

Optional overrides:

- `FISH_AUDIO_BASE_URL` — defaults to `https://api.fish.audio`.

### Exit codes

| Code | Meaning |
|------|---------|
| `0`  | Connection + authentication succeeded |
| `1`  | Reached Fish Audio, but auth/endpoint failed (e.g. 401/403) |
| `2`  | Could not reach Fish Audio (network/proxy/DNS/TLS failure) |
| `3`  | Misconfiguration (missing `FISH_AUDIO_API_KEY`) |

### Note on this environment

If run from a Claude Code web/remote session whose network policy does not
allow `api.fish.audio`, the script exits with code `2` — the request is
blocked at the proxy before it reaches Fish Audio. Run it in an environment
that permits outbound access to `api.fish.audio`, or add that host to the
environment's network allowlist.
