---
id: "{{prefix}}-04-wardrobe"
title: "Wardrobe — {{charName}}"
description: Generate one reference image per wardrobe variant the screenplay calls for.
dependencies:
  - "{{prefix}}-02-turnaround"
skills:
  - image-generate
tags:
  - character
  - reference
  - image
  - wardrobe
inputs:
  - screenplay.fountain
  - "{{charDir}}/turnaround.png"
  - "{{charDir}}/description.md"
outputs:
  - "{{charDir}}/wardrobe-*.png"
  - "{{charDir}}/wardrobe.json"
checks:
  - id: wardrobe-manifest-exists
    cmd: test -s {{charDir}}/wardrobe.json
    description: wardrobe.json written
  - id: at-least-one-wardrobe
    cmd: ls {{charDir}}/wardrobe-*.png 2>/dev/null | wc -l  | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=1?0:1)"
    description: At least one wardrobe variant was generated
---

# Wardrobe — {{charName}}

Scan `screenplay.fountain` for every wardrobe change this character undergoes (costume change between scenes, weather-dressing, etc.) and generate one reference image per variant.

## Step 1 — enumerate variants

Walk the screenplay. Each distinct outfit becomes a wardrobe variant. If the character wears one outfit the whole film, you still generate ONE variant called `default`.

Write `{{charDir}}/wardrobe.json`:

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
Same character as reference: {{charName}}.

{{charVisualDescription}}

Wardrobe: <variant.description>

Full body, front view, neutral stance, plain light-grey seamless background.
Evenly lit. Photoreal cinematic.
Preserve face and body identity from reference image.
```

```
skills/image-generate {
  prompt: <above>,
  references: ["{{charDir}}/turnaround.png"],
  aspect_ratio: "9:16",
  seed: "auto"
}
```

Write output to `{{charDir}}/wardrobe-<variant.id>.png`.

Also write a seed file per variant: `{{charDir}}/wardrobe-<variant.id>.seed.txt`.
