---
id: "{{prefix}}-01-visual-desc"
title: "Visual Description — {{charName}}"
description: Expand the locked short-text visual description into a full character description for reference generation.
tags:
  - character
  - description
inputs:
  - characters.json
  - story-bible.md
outputs:
  - "{{charDir}}/description.md"
checks:
  - id: description-exists
    cmd: test -s {{charDir}}/description.md
    description: Description file written
---

# Visual Description — {{charName}}

Character context:

- **Role**: {{charRole}}
- **Age**: {{charAge}}
- **Bio**: {{charBio}}
- **Arc**: {{charArc}}

Locked 30-word visual description (THIS IS CANON, do not contradict):

> {{charVisualDescription}}

## Task

Write `{{charDir}}/description.md` that **extends** the locked description with details needed for reference image generation — without contradicting it.

## Required sections

```markdown
# {{charName}} — Visual Description

## Locked Description (Canon)
{{charVisualDescription}}

## Physical Details
- Height and build specifics
- Face shape, jawline, cheekbones, nose, lips
- Hair styling details (parting, texture, movement)
- Eye shape, brow
- Skin texture and any marks, scars, tattoos
- Hands and posture

## Default Wardrobe
<What they wear by default. No patterns that will drift across shots — solid colors, simple silhouettes.>

## Behavioral Silhouette
<How they carry themselves — stance, gait, habitual gestures. Informs keyframe poses.>

## What Must Stay Consistent
- <List items that MUST appear identical every shot. E.g. "always wears grandfather's compass on a leather cord.">
```

## Rules

- Never contradict the locked description. Everything added must be compatible.
- Avoid abstract adjectives ("mysterious", "brooding") — use observable detail.
- Keep it 150-250 words total.
