---
id: 002-02-turnaround
title: Turnaround — Elsie
description: "Generate a 4-view character turnaround sheet (front, 3/4, side, back) using Nano-banana."
skills:
  - image-generate
dependencies:
  - 002-01-visual-desc
tags:
  - character
  - reference
  - image
inputs:
  - characters/elsie/description.md
outputs:
  - characters/elsie/turnaround.png
  - characters/elsie/turnaround.seed.txt
checks:
  - id: turnaround-exists
    description: Turnaround image generated
    cmd: test -s characters/elsie/turnaround.png
  - id: turnaround-seed-recorded
    description: Generation seed recorded for future reruns
    cmd: test -s characters/elsie/turnaround.seed.txt
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

# Turnaround — Elsie

Invoke the `image-generate` skill to produce a 4-view character turnaround sheet.

## Prompt to image-generate

Read `characters/elsie/description.md` and construct the prompt:

```
Character reference turnaround sheet: Elsie.

Girl, about seven, small slight build, pale skin, long dark hair loose and tangled, wide dark eyes, serious mouth, barefoot, quiet upright stance.

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

Write the returned image to `characters/elsie/turnaround.png` and the seed to `characters/elsie/turnaround.seed.txt` (single line, just the seed).

## Rules

- Do NOT invent wardrobe details not in `description.md`.
- If the returned image looks inconsistent with the description, regenerate with a different seed (max 3 attempts). Keep the seed file in sync with the final image.

## PNG format (mandatory)

Nano-banana sometimes returns `image/jpeg` bytes. A `.png` file with JPEG
content fails Converge's `valid-png` output validator and stalls convergence.
After writing any image output, normalize it:

```bash
python scripts/to_png.py <output-path>
```

Do this for every image you write in this task. The helper is idempotent (valid
PNGs are re-saved as PNGs).
