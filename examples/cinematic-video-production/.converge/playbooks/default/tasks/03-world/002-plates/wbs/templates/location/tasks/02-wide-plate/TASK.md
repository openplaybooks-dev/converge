---
id: "{{prefix}}-02-wide-plate"
title: "Wide Plate — {{locName}}"
description: Generate the master wide establishing plate for this location (neutral time-of-day).
dependencies:
  - "{{prefix}}-01-description"
skills:
  - image-generate
tags:
  - location
  - reference
  - image
inputs:
  - "{{locDir}}/description.md"
outputs:
  - "{{locDir}}/wide.png"
  - "{{locDir}}/wide.seed.txt"
checks:
  - id: wide-exists
    cmd: test -s {{locDir}}/wide.png
    description: Wide plate generated
---

# Wide Plate — {{locName}}

Master establishing plate. Every other variant uses this as its reference image.

## Prompt

Read `{{locDir}}/description.md` and construct:

```
Establishing wide shot of {{locName}}.

{{locDescription}}

<inject: Architectural/Geographic Detail + Persistent Props + Lighting Geometry + Weather/Atmosphere Baseline from description.md>

Neutral overcast daylight. No characters. No text. No watermarks.
Photoreal cinematic, anamorphic lens look (slight horizontal flare-friendly aspect).
Empty, lived-in, atmospheric.

Aspect ratio: 2.39:1.
```

## Call

```
skills/image-generate {
  prompt: <above>,
  references: [],
  aspect_ratio: "21:9",
  seed: "auto"
}
```

Write `{{locDir}}/wide.png` and `{{locDir}}/wide.seed.txt`.
