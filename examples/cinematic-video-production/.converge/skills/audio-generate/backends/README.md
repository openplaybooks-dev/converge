# audio-generate backends

Each subdirectory is a self-contained backend. Each backend may implement one, two, or all three modes (`tts.js`, `sfx.js`, `score.js`).

## Switching backends

Three files, one per mode — lets you mix providers (e.g. ElevenLabs for TTS, Suno for score):

```bash
echo elevenlabs > ACTIVE-tts
echo stable-audio > ACTIVE-sfx
echo suno > ACTIVE-score
```

If a backend doesn't implement a mode, the dispatcher exits with a clear error.

## Adding a backend

1. `mkdir backends/my-backend`
2. Implement any of:
   - `backends/my-backend/tts.js` → `export async function tts(input)`
   - `backends/my-backend/sfx.js` → `export async function sfx(input)`
   - `backends/my-backend/score.js` → `export async function score(input)`
3. Write a `README.md` documenting env vars and limits.
4. Point the matching `ACTIVE-<mode>` file at your backend.

## Shipped

### stub (default)

Writes 1KB silent WAVs that pass file checks. No real audio.

```bash
echo stub > ACTIVE-tts
echo stub > ACTIVE-sfx
echo stub > ACTIVE-score
```

## Log format

`.converge/logs/audio-generate.log` — one JSON line per call:

```json
{"ts":"2026-04-21T10:23:41Z","mode":"tts","backend":"elevenlabs","shot_id":"sh-0042","duration_s":3.2,"cost_usd":0.012,"ok":true}
```
