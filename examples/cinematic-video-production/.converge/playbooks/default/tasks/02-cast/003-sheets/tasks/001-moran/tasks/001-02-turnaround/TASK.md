---
id: 001-02-turnaround
title: Turnaround — Moran
description: "Generate a 4-view character turnaround sheet (front, 3/4, side, back) using Nano-banana."
skills:
  - image-generate
dependencies:
  - 001-01-visual-desc
tags:
  - character
  - reference
  - image
inputs:
  - characters/moran/description.md
outputs:
  - characters/moran/turnaround.png
  - characters/moran/turnaround.seed.txt
checks:
  - id: turnaround-exists
    description: Turnaround image generated
    cmd: test -s characters/moran/turnaround.png
  - id: turnaround-seed-recorded
    description: Generation seed recorded for future reruns
    cmd: test -s characters/moran/turnaround.seed.txt
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

# Turnaround — Moran

Invoke the `image-generate` skill to produce a 4-view character turnaround sheet.

## Prompt to image-generate

Read `characters/moran/description.md` and construct the prompt:

```
Character reference turnaround sheet: Moran.

Man, sixties, lean weathered frame, sun-creased pale skin, close-cropped grey hair, deep-set grey eyes, heavy brow, rope-knuckled hands, stooped sea-braced posture.

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

Write the returned image to `characters/moran/turnaround.png` and the seed to `characters/moran/turnaround.seed.txt` (single line, just the seed).

## Rules

- Do NOT invent wardrobe details not in `description.md`.
- If the returned image looks inconsistent with the description, regenerate with a different seed (max 3 attempts). Keep the seed file in sync with the final image.
