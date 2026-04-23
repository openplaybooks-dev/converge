---
id: 003-04-wardrobe
title: Wardrobe — Halloran
description: Generate one reference image per wardrobe variant the screenplay calls for.
skills:
  - image-generate
dependencies:
  - 003-02-turnaround
tags:
  - character
  - reference
  - image
  - wardrobe
inputs:
  - screenplay.fountain
  - characters/halloran/turnaround.png
  - characters/halloran/description.md
outputs:
  - "characters/halloran/wardrobe-*.png"
  - characters/halloran/wardrobe.json
checks:
  - id: wardrobe-manifest-exists
    description: wardrobe.json written
    cmd: test -s characters/halloran/wardrobe.json
  - id: at-least-one-wardrobe
    description: At least one wardrobe variant was generated
    cmd: ls characters/halloran/wardrobe-*.png 2>/dev/null | wc -l | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=1?0:1)"
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

# Wardrobe — Halloran

Scan `screenplay.fountain` for every wardrobe change this character undergoes (costume change between scenes, weather-dressing, etc.) and generate one reference image per variant.

## Step 1 — enumerate variants

Walk the screenplay. Each distinct outfit becomes a wardrobe variant. If the character wears one outfit the whole film, you still generate ONE variant called `default`.

Write `characters/halloran/wardrobe.json`:

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
Same character as reference: Halloran.

Man, late sixties, gaunt sinewy frame, sallow weathered skin, thinning white hair swept back, deep-set dark eyes, bony long-fingered hands, stooped scholar's posture.

Wardrobe: <variant.description>

Full body, front view, neutral stance, plain light-grey seamless background.
Evenly lit. Photoreal cinematic.
Preserve face and body identity from reference image.
```

```
skills/image-generate {
  prompt: <above>,
  references: ["characters/halloran/turnaround.png"],
  aspect_ratio: "9:16",
  seed: "auto"
}
```

Write output to `characters/halloran/wardrobe-<variant.id>.png`.

Also write a seed file per variant: `characters/halloran/wardrobe-<variant.id>.seed.txt`.

## PNG format (mandatory)

Nano-banana sometimes returns `image/jpeg` bytes. A `.png` file with JPEG
content fails Converge's `valid-png` output validator and stalls convergence.
After writing any image output, normalize it:

```bash
python scripts/to_png.py <output-path>
```

Do this for every image you write in this task. The helper is idempotent (valid
PNGs are re-saved as PNGs).
