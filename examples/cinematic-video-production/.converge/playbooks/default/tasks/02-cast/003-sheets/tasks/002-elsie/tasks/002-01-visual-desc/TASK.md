---
id: 002-01-visual-desc
title: Visual Description — Elsie
description: Expand the locked short-text visual description into a full character description for reference generation.
tags:
  - character
  - description
inputs:
  - characters.json
  - story-bible.md
outputs:
  - characters/elsie/description.md
checks:
  - id: description-exists
    description: Description file written
    cmd: test -s characters/elsie/description.md
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

# Visual Description — Elsie

Character context:

- **Role**: supporting
- **Age**: about seven
- **Bio**: A child drawn through the lighthouse beam from some older year, clutching a hand-painted wooden toy horse. Belongs to no world that will take her back.
- **Arc**: Arrives silent and translucent, thinning at the edges; ends solid and named, choosing to stay as the keeper's ward.

Locked 30-word visual description (THIS IS CANON, do not contradict):

> Girl, about seven, small slight build, pale skin, long dark hair loose and tangled, wide dark eyes, serious mouth, barefoot, quiet upright stance.

## Task

Write `characters/elsie/description.md` that **extends** the locked description with details needed for reference image generation — without contradicting it.

## Required sections

```markdown
# Elsie — Visual Description

## Locked Description (Canon)
Girl, about seven, small slight build, pale skin, long dark hair loose and tangled, wide dark eyes, serious mouth, barefoot, quiet upright stance.

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
