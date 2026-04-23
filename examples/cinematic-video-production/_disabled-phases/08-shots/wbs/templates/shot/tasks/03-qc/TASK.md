---
id: "{{nnn}}-03-qc"
title: "QC — {{shotId}}"
description: Runtime quality checks on the rendered clip. Emits qc.json with pass/fail and reasons.
dependencies:
  - "{{nnn}}-02-generate"
tags:
  - shot
  - qc
inputs:
  - "{{clipDir}}/video.mp4"
  - "keyframes/{{shotId}}.png"
  - characters/**/ref.json
outputs:
  - "{{clipDir}}/qc.json"
checks:
  - id: qc-json-exists
    cmd: test -s {{clipDir}}/qc.json
    description: qc.json written
---

# QC — {{shotId}}

Run automated checks against `{{clipDir}}/video.mp4`. Write the verdict to `{{clipDir}}/qc.json`:

```json
{
  "shot_id": "{{shotId}}",
  "pass": true,
  "checks": {
    "duration_ok": { "pass": true, "expected_s": {{durationS}}, "actual_s": 6.0, "tolerance_s": 0.5 },
    "file_ok": { "pass": true, "bytes": 1234567 },
    "frame_zero_similar_to_keyframe": { "pass": true, "score": 0.94, "threshold": 0.85 },
    "character_identity_preserved": { "pass": true, "per_character": { "elias-thorn": 0.91 }, "threshold": 0.80 },
    "no_text_artifacts": { "pass": true }
  },
  "notes": ""
}
```

## Checks

1. **duration_ok** — use `ffprobe` to read duration; pass if within ±0.5s of `{{durationS}}`.
2. **file_ok** — stat the file, pass if size > 50KB.
3. **frame_zero_similar_to_keyframe** — extract frame 0 with ffmpeg, compute perceptual hash vs `keyframes/{{shotId}}.png`, pass if similarity ≥ 0.85.
4. **character_identity_preserved** — for each character in frame, extract a face crop from frame 3s of the clip and compare embedding vs `characters/{id}/turnaround.png`; pass if score ≥ 0.80. Skip if the shot has no character face in frame (wide/ews or pure location).
5. **no_text_artifacts** — OCR the middle frame; pass if no words detected (AI video often hallucinates signs/posters/text).

Set top-level `pass: false` if any check fails. Record which check(s) failed in `notes`.

## Tools

- `ffprobe` / `ffmpeg` for duration, frame extraction.
- Any perceptual-hash / face-embedding library (leave the implementation to the executing agent — document the choice in `notes` if relevant).

If tooling is unavailable, record `pass: null` with `notes: "tooling missing"` — the next step treats null as pass.
