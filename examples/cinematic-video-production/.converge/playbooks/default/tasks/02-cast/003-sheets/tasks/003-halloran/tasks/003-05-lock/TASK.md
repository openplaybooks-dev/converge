---
id: 003-05-lock
title: Lock Reference — Halloran
description: "Emit characters/{id}/ref.json — the frozen reference bundle every downstream shot cites."
dependencies:
  - 003-02-turnaround
  - 003-03-expressions
  - 003-04-wardrobe
tags:
  - character
  - reference
  - lock
inputs:
  - characters/halloran/turnaround.png
  - characters/halloran/expressions.png
  - characters/halloran/wardrobe.json
outputs:
  - characters/halloran/ref.json
checks:
  - id: ref-json-exists
    description: ref.json written
    cmd: test -s characters/halloran/ref.json
  - id: ref-json-valid
    description: ref.json has required fields
    cmd: "node -e \"const r=require('./characters/halloran/ref.json');if(!r.id||!r.visual_description||!r.images||!r.images.turnaround){process.exit(1)}\""
vars:
  prefix: 003
  charId: halloran
  charName: Halloran
  charRole: minor
  charAge: "deceased, late sixties in life"
  charBio: "The lighthouse keeper before Moran, dead for decades. His oilcloth-bound journal carries instructions no manual contains — that the lamp is not a machine and must be fed attention."
  charArc: "Present only through the voice of his journal; guides Moran across the gap of years toward the lamp's true nature."
  charVisualDescription: "Man, late sixties, gaunt sinewy frame, sallow weathered skin, thinning white hair swept back, deep-set dark eyes, bony long-fingered hands, stooped scholar's posture."
  charDir: characters/halloran
---

# Lock Reference — Halloran

Freeze the reference bundle. This file is canonical input to every keyframe and shot prompt.

## Output

Write `characters/halloran/ref.json`:

```json
{
  "id": "halloran",
  "name": "Halloran",
  "visual_description": "Man, late sixties, gaunt sinewy frame, sallow weathered skin, thinning white hair swept back, deep-set dark eyes, bony long-fingered hands, stooped scholar's posture.",
  "images": {
    "turnaround": "characters/halloran/turnaround.png",
    "expressions": "characters/halloran/expressions.png",
    "wardrobe": {
      "default": "characters/halloran/wardrobe-default.png"
      /* ... one entry per variant in wardrobe.json ... */
    }
  },
  "seeds": {
    "turnaround": "<contents of characters/halloran/turnaround.seed.txt>",
    "expressions": "<contents of characters/halloran/expressions.seed.txt>",
    "wardrobe": {
      "default": "<contents of characters/halloran/wardrobe-default.seed.txt>"
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
