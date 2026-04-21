---
id: 001-03-expressions
title: Expressions — Moran
description: "Generate a 5-expression sheet (neutral, happy, angry, sad, scared) with the turnaround as a reference."
skills:
  - image-generate
dependencies:
  - 001-02-turnaround
tags:
  - character
  - reference
  - image
inputs:
  - characters/moran/turnaround.png
  - characters/moran/description.md
outputs:
  - characters/moran/expressions.png
  - characters/moran/expressions.seed.txt
checks:
  - id: expressions-exists
    description: Expressions image generated
    cmd: test -s characters/moran/expressions.png
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

# Expressions — Moran

Generate a 5-expression strip using the turnaround as a reference image so the face stays identical.

## Prompt

```
Same character as reference image: Moran.

Man, sixties, lean weathered frame, sun-creased pale skin, close-cropped grey hair, deep-set grey eyes, heavy brow, rope-knuckled hands, stooped sea-braced posture.

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
  references: ["characters/moran/turnaround.png"],
  aspect_ratio: "16:9",
  seed: "auto"
}
```

Write `characters/moran/expressions.png` and `characters/moran/expressions.seed.txt`.

## Rule

If the face identity drifts from the turnaround, regenerate (max 3 tries). Identity drift here cascades into every shot — it's cheap to catch now, expensive to catch later.
