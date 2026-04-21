---
id: 001-04-wardrobe
title: Wardrobe — Moran
description: Generate one reference image per wardrobe variant the screenplay calls for.
skills:
  - image-generate
dependencies:
  - 001-02-turnaround
tags:
  - character
  - reference
  - image
  - wardrobe
inputs:
  - screenplay.fountain
  - characters/moran/turnaround.png
  - characters/moran/description.md
outputs:
  - "characters/moran/wardrobe-*.png"
  - characters/moran/wardrobe.json
checks:
  - id: wardrobe-manifest-exists
    description: wardrobe.json written
    cmd: test -s characters/moran/wardrobe.json
  - id: at-least-one-wardrobe
    description: At least one wardrobe variant was generated
    cmd: ls characters/moran/wardrobe-*.png 2>/dev/null | wc -l | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=1?0:1)"
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

# Wardrobe — Moran

Scan `screenplay.fountain` for every wardrobe change this character undergoes (costume change between scenes, weather-dressing, etc.) and generate one reference image per variant.

## Step 1 — enumerate variants

Walk the screenplay. Each distinct outfit becomes a wardrobe variant. If the character wears one outfit the whole film, you still generate ONE variant called `default`.

Write `characters/moran/wardrobe.json`:

```json
[
  {
    "id": "default",
    "label": "Default outfit",
    "scenes": ["sc-001", "sc-002", "sc-003"],
    "description": "Thick wool fisherman's jumper over oil-stained canvas trousers, heavy leather boots, brass compass on leather cord around neck."
  },
  {
    "id": "storm-gear",
    "label": "Storm gear",
    "scenes": ["sc-014"],
    "description": "Yellow oilskin coat and sou'wester hat over default outfit, heavy waterproof gloves."
  }
]
```

## Step 2 — generate one image per variant

For each variant, call `image-generate`:

```
Same character as reference: Moran.

Man, sixties, lean weathered frame, sun-creased pale skin, close-cropped grey hair, deep-set grey eyes, heavy brow, rope-knuckled hands, stooped sea-braced posture.

Wardrobe: <variant.description>

Full body, front view, neutral stance, plain light-grey seamless background.
Evenly lit. Photoreal cinematic.
Preserve face and body identity from reference image.
```

```
skills/image-generate {
  prompt: <above>,
  references: ["characters/moran/turnaround.png"],
  aspect_ratio: "9:16",
  seed: "auto"
}
```

Write output to `characters/moran/wardrobe-<variant.id>.png`.

Also write a seed file per variant: `characters/moran/wardrobe-<variant.id>.seed.txt`.
