---
id: 001-shot-meta
title: Write Per-Clip shot.json
description: For every clip folder, assemble shot.json containing the full reference bundle used to generate that clip.
inputs:
  - shots.json
  - scenes.json
  - clips/**/video.mp4
  - clips/**/video.seed.txt
  - keyframes/**/*.seed.txt
  - characters/**/ref.json
  - locations/**/ref.json
outputs:
  - clips/**/shot.json
checks:
  - id: all-clips-have-shot-json
    cmd: node -e "const fs=require('fs');const dirs=fs.readdirSync('clips',{withFileTypes:true}).filter(d=>d.isDirectory());for(const d of dirs){if(fs.existsSync('clips/'+d.name+'/video.mp4')&&!fs.existsSync('clips/'+d.name+'/shot.json')){console.error('Missing shot.json: '+d.name);process.exit(1)}}"
    description: Every clip with a video.mp4 has a shot.json
---

# Per-Clip shot.json

For every `clips/<slug>/video.mp4`, write a `clips/<slug>/shot.json`:

```json
{
  "clip_slug": "<slug>",
  "shot_id": "sh-0042",
  "scene_id": "sc-007",
  "order": 42,

  "shot": { /* raw entry from shots.json */ },
  "scene": { /* raw entry from scenes.json */ },

  "references_used": {
    "keyframe": "keyframes/sh-0042.png",
    "characters": {
      "elias-thorn": {
        "turnaround": "characters/elias-thorn/turnaround.png",
        "wardrobe": "characters/elias-thorn/wardrobe-storm-gear.png",
        "visual_description": "<verbatim from characters.json>"
      }
    },
    "location": {
      "wide": "locations/lighthouse-lantern-room/wide.png",
      "variant": "locations/lighthouse-lantern-room/variant-night.png",
      "description": "<verbatim from locations.json>"
    },
    "style_guide_sha": "<sha256 of style-guide.md at generation time>",
    "palette_sha": "<sha256 of palette.json at generation time>"
  },

  "seeds": {
    "keyframe": "<from keyframes/sh-0042.seed.txt>",
    "video": "<from clips/<slug>/video.seed.txt>"
  },

  "audio": {
    "dialogue": "clips/<slug>/dialogue.wav OR null",
    "sfx": "clips/<slug>/sfx.wav OR null",
    "music": "clips/<slug>/music.wav OR null"
  },

  "qc": { /* contents of clips/<slug>/qc.json */ },

  "duration_s": 6.0,
  "generated_at": "<ISO 8601 timestamp>"
}
```

## Rules

- Every path must be project-relative and point at an existing file (or explicit `null` for audio stems that don't exist).
- Do NOT rewrite references — they must match what was actually fed to the generator. Pull from prompt.txt if in doubt.
- Compute SHAs with `sha256sum` or equivalent.
