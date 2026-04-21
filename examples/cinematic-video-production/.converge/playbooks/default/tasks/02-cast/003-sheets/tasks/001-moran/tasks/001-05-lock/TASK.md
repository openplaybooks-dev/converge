---
id: 001-05-lock
title: Lock Reference — Moran
description: "Emit characters/{id}/ref.json — the frozen reference bundle every downstream shot cites."
dependencies:
  - 001-02-turnaround
  - 001-03-expressions
  - 001-04-wardrobe
tags:
  - character
  - reference
  - lock
inputs:
  - characters/moran/turnaround.png
  - characters/moran/expressions.png
  - characters/moran/wardrobe.json
outputs:
  - characters/moran/ref.json
checks:
  - id: ref-json-exists
    description: ref.json written
    cmd: test -s characters/moran/ref.json
  - id: ref-json-valid
    description: ref.json has required fields
    cmd: "node -e \"const r=require('./characters/moran/ref.json');if(!r.id||!r.visual_description||!r.images||!r.images.turnaround){process.exit(1)}\""
vars:
  prefix: 001
  charId: moran
  charName: Moran
  charRole: protagonist
  charAge: sixties
  charBio: "Reclusive keeper of a remote headland lighthouse. Widowed, childless, kept the lamp lit for forty years before automation retired him in place."
  charArc: Starts resigned to end-of-life solitude on his rock; ends reclaiming purpose by becoming keeper to a child the light has placed in his care.
  charVisualDescription: "Man, sixties, lean weathered frame, sun-creased pale skin, close-cropped grey hair, deep-set grey eyes, heavy brow, rope-knuckled hands, stooped sea-braced posture."
  charDir: characters/moran
---

# Lock Reference — Moran

Freeze the reference bundle. This file is canonical input to every keyframe and shot prompt.

## Output

Write `characters/moran/ref.json`:

```json
{
  "id": "moran",
  "name": "Moran",
  "visual_description": "Man, sixties, lean weathered frame, sun-creased pale skin, close-cropped grey hair, deep-set grey eyes, heavy brow, rope-knuckled hands, stooped sea-braced posture.",
  "images": {
    "turnaround": "characters/moran/turnaround.png",
    "expressions": "characters/moran/expressions.png",
    "wardrobe": {
      "default": "characters/moran/wardrobe-default.png"
      /* ... one entry per variant in wardrobe.json ... */
    }
  },
  "seeds": {
    "turnaround": "<contents of characters/moran/turnaround.seed.txt>",
    "expressions": "<contents of characters/moran/expressions.seed.txt>",
    "wardrobe": {
      "default": "<contents of characters/moran/wardrobe-default.seed.txt>"
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
