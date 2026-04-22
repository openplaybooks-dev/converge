---
id: 002-03-expressions
title: Expressions — Elsie
description: "Generate a 5-expression sheet (neutral, happy, angry, sad, scared) with the turnaround as a reference."
skills:
  - image-generate
dependencies:
  - 002-02-turnaround
tags:
  - character
  - reference
  - image
inputs:
  - characters/elsie/turnaround.png
  - characters/elsie/description.md
outputs:
  - characters/elsie/expressions.png
  - characters/elsie/expressions.seed.txt
checks:
  - id: expressions-exists
    description: Expressions image generated
    cmd: test -s characters/elsie/expressions.png
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

# Expressions — Elsie

Generate a 5-expression strip using the turnaround as a reference image so the face stays identical.

## Prompt

```
Same character as reference image: Elsie.

Girl, about seven, small slight build, pale skin, long dark hair loose and tangled, wide dark eyes, serious mouth, barefoot, quiet upright stance.

Five head-and-shoulders portraits on one image, left-to-right:
1. NEUTRAL — relaxed, looking into lens.
2. HAPPY — genuine smile, eyes crinkled.
3. ANGRY — jaw set, brow down, controlled fury (not shouting).
4. SAD — eyes downcast, mouth soft, weight of grief.
5. SCARED — eyes wide, lips parted, breath held.

Same lighting, same background, same wardrobe across all five.
Preserve face identity from the reference image exactly.
Photoreal cinematic style.

Aspect ratio: 16:9.
```

## Call

```
skills/image-generate {
  prompt: <above>,
  references: ["characters/elsie/turnaround.png"],
  aspect_ratio: "16:9",
  seed: "auto"
}
```

Write `characters/elsie/expressions.png` and `characters/elsie/expressions.seed.txt`.

## Rule

If the face identity drifts from the turnaround, regenerate (max 3 tries). Identity drift here cascades into every shot — it's cheap to catch now, expensive to catch later.

## PNG format (mandatory)

Nano-banana sometimes returns `image/jpeg` bytes. A `.png` file with JPEG
content fails Converge's `valid-png` output validator and stalls convergence.
After writing any image output, normalize it:

```bash
python scripts/to_png.py <output-path>
```

Do this for every image you write in this task. The helper is idempotent (valid
PNGs are re-saved as PNGs).
