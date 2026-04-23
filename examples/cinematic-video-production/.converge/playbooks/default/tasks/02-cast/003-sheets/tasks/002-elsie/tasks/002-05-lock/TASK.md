---
id: 002-05-lock
title: Lock Reference — Elsie
description: "Emit characters/{id}/ref.json — the frozen reference bundle every downstream shot cites."
dependencies:
  - 002-02-turnaround
  - 002-03-expressions
  - 002-04-wardrobe
tags:
  - character
  - reference
  - lock
inputs:
  - characters/elsie/turnaround.png
  - characters/elsie/expressions.png
  - characters/elsie/wardrobe.json
outputs:
  - characters/elsie/ref.json
checks:
  - id: ref-json-exists
    description: ref.json written
    cmd: test -s characters/elsie/ref.json
  - id: ref-json-valid
    description: ref.json has required fields
    cmd: "node -e \"const r=require('./characters/elsie/ref.json');if(!r.id||!r.visual_description||!r.images||!r.images.turnaround){process.exit(1)}\""
vars:
  prefix: 002
  charId: elsie
  charName: Elsie
  charRole: supporting
  charAge: about seven
  charBio: "A child drawn through the lighthouse beam from some older year, clutching a hand-painted wooden toy horse. Belongs to no world that will take her back."
  charArc: "Arrives silent and translucent, thinning at the edges; ends solid and named, choosing to stay as the keeper's ward."
  charVisualDescription: "Girl, about seven, small slight build, pale skin, long dark hair loose and tangled, wide dark eyes, serious mouth, barefoot, quiet upright stance."
  charDir: characters/elsie
---

# Lock Reference — Elsie

Freeze the reference bundle. This file is canonical input to every keyframe and shot prompt.

## Output

Write `characters/elsie/ref.json`:

```json
{
  "id": "elsie",
  "name": "Elsie",
  "visual_description": "Girl, about seven, small slight build, pale skin, long dark hair loose and tangled, wide dark eyes, serious mouth, barefoot, quiet upright stance.",
  "images": {
    "turnaround": "characters/elsie/turnaround.png",
    "expressions": "characters/elsie/expressions.png",
    "wardrobe": {
      "default": "characters/elsie/wardrobe-default.png"
      /* ... one entry per variant in wardrobe.json ... */
    }
  },
  "seeds": {
    "turnaround": "<contents of characters/elsie/turnaround.seed.txt>",
    "expressions": "<contents of characters/elsie/expressions.seed.txt>",
    "wardrobe": {
      "default": "<contents of characters/elsie/wardrobe-default.seed.txt>"
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
