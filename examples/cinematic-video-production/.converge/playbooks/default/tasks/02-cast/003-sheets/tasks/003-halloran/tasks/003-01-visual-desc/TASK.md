---
id: 003-01-visual-desc
title: Visual Description — Halloran
description: Expand the locked short-text visual description into a full character description for reference generation.
tags:
  - character
  - description
inputs:
  - characters.json
  - story-bible.md
outputs:
  - characters/halloran/description.md
checks:
  - id: description-exists
    description: Description file written
    cmd: test -s characters/halloran/description.md
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

# Visual Description — Halloran

Character context:

- **Role**: minor
- **Age**: deceased, late sixties in life
- **Bio**: The lighthouse keeper before Moran, dead for decades. His oilcloth-bound journal carries instructions no manual contains — that the lamp is not a machine and must be fed attention.
- **Arc**: Present only through the voice of his journal; guides Moran across the gap of years toward the lamp's true nature.

Locked 30-word visual description (THIS IS CANON, do not contradict):

> Man, late sixties, gaunt sinewy frame, sallow weathered skin, thinning white hair swept back, deep-set dark eyes, bony long-fingered hands, stooped scholar's posture.

## Task

Write `characters/halloran/description.md` that **extends** the locked description with details needed for reference image generation — without contradicting it.

## Required sections

```markdown
# Halloran — Visual Description

## Locked Description (Canon)
Man, late sixties, gaunt sinewy frame, sallow weathered skin, thinning white hair swept back, deep-set dark eyes, bony long-fingered hands, stooped scholar's posture.

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
