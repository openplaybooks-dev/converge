---
id: 002-04-wardrobe
title: Wardrobe — Elsie
description: Generate one reference image per wardrobe variant the screenplay calls for.
skills:
  - image-generate
dependencies:
  - 002-02-turnaround
tags:
  - character
  - reference
  - image
  - wardrobe
inputs:
  - screenplay.fountain
  - characters/elsie/turnaround.png
  - characters/elsie/description.md
outputs:
  - "characters/elsie/wardrobe-*.png"
  - characters/elsie/wardrobe.json
checks:
  - id: wardrobe-manifest-exists
    description: wardrobe.json written
    cmd: test -s characters/elsie/wardrobe.json
  - id: at-least-one-wardrobe
    description: At least one wardrobe variant was generated
    cmd: ls characters/elsie/wardrobe-*.png 2>/dev/null | wc -l | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=1?0:1)"
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

# Wardrobe — Elsie

Scan `screenplay.fountain` for every wardrobe change this character undergoes (costume change between scenes, weather-dressing, etc.) and generate one reference image per variant.

## Step 1 — enumerate variants

Walk the screenplay. Each distinct outfit becomes a wardrobe variant. If the character wears one outfit the whole film, you still generate ONE variant called `default`.

Write `characters/elsie/wardrobe.json`:

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
Same character as reference: Elsie.

Girl, about seven, small slight build, pale skin, long dark hair loose and tangled, wide dark eyes, serious mouth, barefoot, quiet upright stance.

Wardrobe: <variant.description>

Full body, front view, neutral stance, plain light-grey seamless background.
Evenly lit. Photoreal cinematic.
Preserve face and body identity from reference image.
```

```
skills/image-generate {
  prompt: <above>,
  references: ["characters/elsie/turnaround.png"],
  aspect_ratio: "9:16",
  seed: "auto"
}
```

Write output to `characters/elsie/wardrobe-<variant.id>.png`.

Also write a seed file per variant: `characters/elsie/wardrobe-<variant.id>.seed.txt`.

## PNG format (mandatory)

Nano-banana sometimes returns `image/jpeg` bytes. A `.png` file with JPEG
content fails Converge's `valid-png` output validator and stalls convergence.
After writing any image output, normalize it:

```bash
python scripts/to_png.py <output-path>
```

Do this for every image you write in this task. The helper is idempotent (valid
PNGs are re-saved as PNGs).
