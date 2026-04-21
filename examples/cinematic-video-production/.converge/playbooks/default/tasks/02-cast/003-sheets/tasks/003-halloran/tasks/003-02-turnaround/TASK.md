---
id: 003-02-turnaround
title: Turnaround — Halloran
description: "Generate a 4-view character turnaround sheet (front, 3/4, side, back) using Nano-banana."
skills:
  - image-generate
dependencies:
  - 003-01-visual-desc
tags:
  - character
  - reference
  - image
inputs:
  - characters/halloran/description.md
outputs:
  - characters/halloran/turnaround.png
  - characters/halloran/turnaround.seed.txt
checks:
  - id: turnaround-exists
    description: Turnaround image generated
    cmd: test -s characters/halloran/turnaround.png
  - id: turnaround-seed-recorded
    description: Generation seed recorded for future reruns
    cmd: test -s characters/halloran/turnaround.seed.txt
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

# Turnaround — Halloran

Invoke the `image-generate` skill to produce a 4-view character turnaround sheet.

## Prompt to image-generate

Read `characters/halloran/description.md` and construct the prompt:

```
Character reference turnaround sheet: Halloran.

Man, late sixties, gaunt sinewy frame, sallow weathered skin, thinning white hair swept back, deep-set dark eyes, bony long-fingered hands, stooped scholar's posture.

Four views on a single image, left-to-right: FRONT, 3/4 FRONT, SIDE, BACK.
Neutral expression. Relaxed stance (not T-pose — natural standing).
Default wardrobe from description.md.
Plain light-grey seamless background.
Evenly lit from front-left with soft fill.
Full body visible in every view. Same height, same scale across all four.
Photoreal cinematic style. No text, no watermarks, no labels.

Aspect ratio: 16:9.
```

## Call

```
skills/image-generate {
  prompt: <above>,
  references: [],           // first generation — no refs yet
  aspect_ratio: "16:9",
  seed: "auto"
}
```

Write the returned image to `characters/halloran/turnaround.png` and the seed to `characters/halloran/turnaround.seed.txt` (single line, just the seed).

## Rules

- Do NOT invent wardrobe details not in `description.md`.
- If the returned image looks inconsistent with the description, regenerate with a different seed (max 3 attempts). Keep the seed file in sync with the final image.
