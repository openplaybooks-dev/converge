---
id: "{{prefix}}-02-turnaround"
title: "Turnaround — {{charName}}"
description: Generate a 4-view character turnaround sheet (front, 3/4, side, back) using Nano-banana.
dependencies:
  - "{{prefix}}-01-visual-desc"
skills:
  - image-generate
tags:
  - character
  - reference
  - image
inputs:
  - "{{charDir}}/description.md"
outputs:
  - "{{charDir}}/turnaround.png"
  - "{{charDir}}/turnaround.seed.txt"
checks:
  - id: turnaround-exists
    cmd: test -s {{charDir}}/turnaround.png
    description: Turnaround image generated
  - id: turnaround-seed-recorded
    cmd: test -s {{charDir}}/turnaround.seed.txt
    description: Generation seed recorded for future reruns
---

# Turnaround — {{charName}}

Invoke the `image-generate` skill to produce a 4-view character turnaround sheet.

## Prompt to image-generate

Read `{{charDir}}/description.md` and construct the prompt:

```
Character reference turnaround sheet: {{charName}}.

{{charVisualDescription}}

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

Write the returned image to `{{charDir}}/turnaround.png` and the seed to `{{charDir}}/turnaround.seed.txt` (single line, just the seed).

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
