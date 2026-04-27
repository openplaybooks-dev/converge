# Kling 2.5 backend (skeleton)

Status: **NOT WIRED**. The shipped `generate.js` documents the request shape but throws when called. Edit it to add the real HTTP client.

## Why Kling for character spritesheets

Kling 2.5's img2vid mode is the strongest at preserving character identity from a single reference frame — better than Veo 3 or Runway Gen-4 for stylized/non-photoreal characters. It's the recommended starting point for the `game-assets-video` example.

## Required env vars

- `KLING_API_KEY` — single-key auth (simpler), OR
- `KLING_ACCESS_KEY` + `KLING_SECRET_KEY` — JWT auth (some providers)

## Supported parameters

- **Aspect ratios**: `16:9`, `9:16`, `1:1` (we map `4:3`, `3:4` → `1:1`)
- **Duration**: `5` or `10` seconds only — non-matching values are rounded
- **Seed**: passed via `external_task_id`; reproducibility is best-effort, not guaranteed
- **First frame**: required; uploaded as base64 PNG

## Background-removal note

Kling does NOT produce transparent backgrounds. To make the extracted frames usable as sprites, the prompt MUST request a solid pure-color background (e.g. "pure chroma green #00FF00 background, no shadows, no texture") and the `extract_video_frames.py` step will chroma-key it out.

## Cost

Roughly $0.30–$0.50 per 5-second clip at the time of writing. Verify against your provider's current pricing.

## Wiring it in

See the commented-out block in `generate.js`. Replace the `throw new Error('kling backend not wired')` with the real fetch + poll + download flow.
