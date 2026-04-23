---
id: 001-01-visual-desc
title: Visual Description — Moran
description: Expand the locked short-text visual description into a full character description for reference generation.
tags:
  - character
  - description
inputs:
  - characters.json
  - story-bible.md
outputs:
  - characters/moran/description.md
checks:
  - id: description-exists
    description: Description file written
    cmd: test -s characters/moran/description.md
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

# Visual Description — Moran

Character context:

- **Role**: protagonist
- **Age**: sixties
- **Bio**: Reclusive keeper of a remote headland lighthouse. Widowed, childless, kept the lamp lit for forty years before automation retired him in place.
- **Arc**: Starts resigned to end-of-life solitude on his rock; ends reclaiming purpose by becoming keeper to a child the light has placed in his care.

Locked 30-word visual description (THIS IS CANON, do not contradict):

> Man, sixties, lean weathered frame, sun-creased pale skin, close-cropped grey hair, deep-set grey eyes, heavy brow, rope-knuckled hands, stooped sea-braced posture.

## Task

Write `characters/moran/description.md` that **extends** the locked description with details needed for reference image generation — without contradicting it.

## Required sections

```markdown
# Moran — Visual Description

## Locked Description (Canon)
Man, sixties, lean weathered frame, sun-creased pale skin, close-cropped grey hair, deep-set grey eyes, heavy brow, rope-knuckled hands, stooped sea-braced posture.

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
