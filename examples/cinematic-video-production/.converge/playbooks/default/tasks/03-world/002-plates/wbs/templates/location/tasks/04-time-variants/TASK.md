---
id: "{{prefix}}-04-time-variants"
title: "Time Variants — {{locName}}"
description: For each time_variant in locations.json, generate a version of the wide plate at that time of day.
dependencies:
  - "{{prefix}}-02-wide-plate"
skills:
  - image-generate
tags:
  - location
  - reference
  - image
  - time-of-day
inputs:
  - "{{locDir}}/wide.png"
  - locations.json
outputs:
  - "{{locDir}}/variant-*.png"
checks:
  - id: at-least-one-variant
    cmd: ls {{locDir}}/variant-*.png 2>/dev/null | wc -l  | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=1?0:1)"
    description: At least one time variant generated
---

# Time Variants — {{locName}}

For each time_variant listed for this location in `locations.json` (found at `{{locTimeVariants}}`), generate a version of the wide plate under that lighting.

## Lighting rules per time-of-day

- `day`: high key, diffused overcast or midday sun, flat soft shadows.
- `golden-hour`: low warm sun, long shadows, honey tone, god-rays where windows permit.
- `dusk`: cool blue ambient, warm practicals just turning on, silhouettes.
- `night`: deep blue ambient, moonlight or practical lights only, deep shadows.
- `dawn`: cool pale blue, low cool sun, mist.
- `overcast`: flat grey, no direct sun, soft everywhere.

## Call (per variant)

```
skills/image-generate {
  prompt: "Same location as reference image: {{locName}}. {{locDescription}} Time of day: <variant>. <lighting rule from above>. No characters. Photoreal cinematic.",
  references: ["{{locDir}}/wide.png"],
  aspect_ratio: "21:9",
  seed: "auto"
}
```

Write `{{locDir}}/variant-<tod>.png` and matching seed file per variant.

## Rule

Architecture, prop placement, and camera framing must match the wide plate exactly. Only lighting changes.
