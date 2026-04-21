---
id: 003-03-expressions
title: Expressions — Halloran
description: "Generate a 5-expression sheet (neutral, happy, angry, sad, scared) with the turnaround as a reference."
skills:
  - image-generate
dependencies:
  - 003-02-turnaround
tags:
  - character
  - reference
  - image
inputs:
  - characters/halloran/turnaround.png
  - characters/halloran/description.md
outputs:
  - characters/halloran/expressions.png
  - characters/halloran/expressions.seed.txt
checks:
  - id: expressions-exists
    description: Expressions image generated
    cmd: test -s characters/halloran/expressions.png
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

# Expressions — Halloran

Generate a 5-expression strip using the turnaround as a reference image so the face stays identical.

## Prompt

```
Same character as reference image: Halloran.

Man, late sixties, gaunt sinewy frame, sallow weathered skin, thinning white hair swept back, deep-set dark eyes, bony long-fingered hands, stooped scholar's posture.

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
  references: ["characters/halloran/turnaround.png"],
  aspect_ratio: "16:9",
  seed: "auto"
}
```

Write `characters/halloran/expressions.png` and `characters/halloran/expressions.seed.txt`.

## Rule

If the face identity drifts from the turnaround, regenerate (max 3 tries). Identity drift here cascades into every shot — it's cheap to catch now, expensive to catch later.
