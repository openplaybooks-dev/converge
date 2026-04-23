---
id: 002-manifest
title: Emit clips.json Manifest
description: Walk clips/*/shot.json in order and emit the top-level clips.json manifest an NLE can import.
dependencies:
  - 001-shot-meta
inputs:
  - clips/**/shot.json
  - shots.json
  - scenes.json
outputs:
  - clips.json
checks:
  - id: clips-json-exists
    cmd: test -s clips.json
    description: clips.json written
  - id: clips-json-valid
    cmd: node -e "const c=require('./clips.json');if(c.version!==1||!Array.isArray(c.clips)){process.exit(1)}"
    description: clips.json has version=1 and clips array
  - id: manifest-passes-verifier
    cmd: node scripts/verify-manifest.js
    description: verify-manifest.js passes end-to-end
---

# Emit clips.json

Walk every `clips/<slug>/shot.json` in global shot order and build `clips.json` matching `schemas/clips.schema.json`:

```json
{
  "version": 1,
  "fps": 24,
  "clips": [
    {
      "clip_id": "001-sh-0001-wide-establish",
      "shot_id": "sh-0001",
      "scene_id": "sc-001",
      "order": 1,
      "path": "clips/001-sh-0001-wide-establish/video.mp4",
      "duration_s": 6.0,
      "in_tc": "00:00:00:00",
      "out_tc": "00:00:06:00",
      "transition_in": "cut",
      "transition_out": "cut",
      "audio": {
        "dialogue": null,
        "sfx": "clips/001-sh-0001-wide-establish/sfx.wav",
        "music": "clips/001-sh-0001-wide-establish/music.wav"
      }
    }
    /* ... one entry per clip ... */
  ]
}
```

## Rules

- `fps` = 24 (cinematic default). Do not change unless the user overrides.
- `in_tc` / `out_tc`: running timeline timecode in `HH:MM:SS:FF` at 24fps. Each clip's `in_tc` equals the previous clip's `out_tc`.
- `transition_in` / `transition_out`: default `"cut"`. If `scene_id` changes between consecutive clips, set `transition_out` on the last clip of the outgoing scene to `"fade-to-black"` and `transition_in` on the first clip of the incoming scene to `"fade-from-black"`. User can override in the NLE.
- Audio keys are `null` if the corresponding file does not exist — never point at missing files.
- `clip_id` must be globally unique. The `NNN-<shot_id>-<action-slug>` folder name works.
