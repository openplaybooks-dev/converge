---
id: "{{prefix}}-03-detail-plates"
title: "Detail Plates — {{locName}}"
description: Generate 2-3 detail-angle plates (medium shots of key features) using the wide as reference.
dependencies:
  - "{{prefix}}-02-wide-plate"
skills:
  - image-generate
tags:
  - location
  - reference
  - image
inputs:
  - "{{locDir}}/wide.png"
  - "{{locDir}}/description.md"
outputs:
  - "{{locDir}}/detail-*.png"
  - "{{locDir}}/details.json"
checks:
  - id: details-manifest
    cmd: test -s {{locDir}}/details.json
    description: details.json written
  - id: at-least-one-detail
    cmd: ls {{locDir}}/detail-*.png 2>/dev/null | wc -l | awk '{if ($1 >= 1) exit 0; exit 1}'
    description: At least one detail plate generated
---

# Detail Plates — {{locName}}

Medium-shot details of the location's most cinematographically important features. 2-3 angles.

## Step 1 — pick angles

Read `description.md` and pick 2-3 hero elements that shots will return to repeatedly. Write `{{locDir}}/details.json`:

```json
[
  { "id": "lamp", "label": "Fresnel lens head-on", "prompt_hint": "brass Fresnel lens dead center, slight low-angle, glass prisms catching window light" },
  { "id": "stairs", "label": "Iron staircase from below", "prompt_hint": "spiral iron staircase from the trapdoor, looking up toward the lantern room" },
  { "id": "window", "label": "North-facing window with sea beyond", "prompt_hint": "copper-framed window from inside, sea and rocks visible through glass" }
]
```

## Step 2 — generate one image per angle

For each entry, call:

```
skills/image-generate {
  prompt: "Medium detail shot of {{locName}}: <entry.prompt_hint>. Same location as reference image. Neutral overcast daylight. No characters. Photoreal cinematic.",
  references: ["{{locDir}}/wide.png"],
  aspect_ratio: "21:9",
  seed: "auto"
}
```

Write `{{locDir}}/detail-<entry.id>.png` and `{{locDir}}/detail-<entry.id>.seed.txt` per entry.
