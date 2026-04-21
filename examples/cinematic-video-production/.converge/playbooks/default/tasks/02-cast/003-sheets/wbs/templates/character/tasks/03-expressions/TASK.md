---
id: "{{prefix}}-03-expressions"
title: "Expressions — {{charName}}"
description: Generate a 5-expression sheet (neutral, happy, angry, sad, scared) with the turnaround as a reference.
dependencies:
  - "{{prefix}}-02-turnaround"
skills:
  - image-generate
tags:
  - character
  - reference
  - image
inputs:
  - "{{charDir}}/turnaround.png"
  - "{{charDir}}/description.md"
outputs:
  - "{{charDir}}/expressions.png"
  - "{{charDir}}/expressions.seed.txt"
checks:
  - id: expressions-exists
    cmd: test -s {{charDir}}/expressions.png
    description: Expressions image generated
---

# Expressions — {{charName}}

Generate a 5-expression strip using the turnaround as a reference image so the face stays identical.

## Prompt

```
Same character as reference image: {{charName}}.

{{charVisualDescription}}

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
  references: ["{{charDir}}/turnaround.png"],
  aspect_ratio: "16:9",
  seed: "auto"
}
```

Write `{{charDir}}/expressions.png` and `{{charDir}}/expressions.seed.txt`.

## Rule

If the face identity drifts from the turnaround, regenerate (max 3 tries). Identity drift here cascades into every shot — it's cheap to catch now, expensive to catch later.
