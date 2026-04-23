---
id: "{{prefix}}-05-lock"
title: "Lock Reference — {{charName}}"
description: Emit characters/{id}/ref.json — the frozen reference bundle every downstream shot cites.
dependencies:
  - "{{prefix}}-02-turnaround"
  - "{{prefix}}-03-expressions"
  - "{{prefix}}-04-wardrobe"
tags:
  - character
  - reference
  - lock
inputs:
  - "{{charDir}}/turnaround.png"
  - "{{charDir}}/expressions.png"
  - "{{charDir}}/wardrobe.json"
outputs:
  - "{{charDir}}/ref.json"
checks:
  - id: ref-json-exists
    cmd: test -s {{charDir}}/ref.json
    description: ref.json written
  - id: ref-json-valid
    cmd: node -e "const r=require('./{{charDir}}/ref.json');if(!r.id||!r.visual_description||!r.images||!r.images.turnaround){process.exit(1)}"
    description: ref.json has required fields
---

# Lock Reference — {{charName}}

Freeze the reference bundle. This file is canonical input to every keyframe and shot prompt.

## Output

Write `{{charDir}}/ref.json`:

```json
{
  "id": "{{charId}}",
  "name": "{{charName}}",
  "visual_description": "{{charVisualDescription}}",
  "images": {
    "turnaround": "{{charDir}}/turnaround.png",
    "expressions": "{{charDir}}/expressions.png",
    "wardrobe": {
      "default": "{{charDir}}/wardrobe-default.png"
      /* ... one entry per variant in wardrobe.json ... */
    }
  },
  "seeds": {
    "turnaround": "<contents of {{charDir}}/turnaround.seed.txt>",
    "expressions": "<contents of {{charDir}}/expressions.seed.txt>",
    "wardrobe": {
      "default": "<contents of {{charDir}}/wardrobe-default.seed.txt>"
      /* ... per variant ... */
    }
  }
}
```

## Rules

- Do NOT regenerate images here. This task only assembles metadata.
- Copy the exact `visual_description` from `characters.json` — it is canon.
- Every path in `images` must resolve to an existing file.
- Every seed must be read from the corresponding `.seed.txt` file as a plain string.
