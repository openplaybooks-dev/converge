---
id: "{{pipelineId}}-03-blend"
title: "Blend keyframe — {{shotId}} {{frame}}"
description: Call Nano-banana to blend the composition into a photoreal keyframe.
dependencies:
  - "{{pipelineId}}-02-preview"
skills:
  - image-generate
tags:
  - keyframe
  - composition
  - blend
inputs:
  - "{{compositionPath}}"
  - "{{previewPath}}"
outputs:
  - "{{keyframePath}}"
  - "keyframes/{{shotId}}/{{frame}}.seed.txt"
  - "keyframes/{{shotId}}/{{frame}}.prompt.txt"
checks:
  - id: keyframe-rendered
    cmd: test -s {{keyframePath}}
    description: Photoreal keyframe rendered
  - id: prompt-recorded
    cmd: test -s keyframes/{{shotId}}/{{frame}}.prompt.txt
    description: Prompt recorded for reproducibility
  - id: seed-recorded
    cmd: test -s keyframes/{{shotId}}/{{frame}}.seed.txt
    description: Seed recorded
---

# Blend keyframe — {{shotId}} {{frame}}

Call the blender:

```bash
python scripts/compose_blend.py {{compositionPath}}
```

This:
1. Loads the composition.
2. Sends to Nano-banana in reference order: `[preview blueprint, base plate, element refs…]`.
3. Writes `{{keyframePath}}`, its seed file, and its prompt file.

## Environment

`GEMINI_API_KEY` must be set. Without it, the script exits with a clear error.

## Regen

If the blended output violates identity (character face wrong, wardrobe wrong, off-palette), the problem is almost always the composition or the refs — NOT the blend. Fix upstream and rerun the full 3-step pipeline for this frame. Do not simply re-run the blend with a new seed hoping for luck.

Acceptable regen reasons:
- Nano-banana hallucinated text/labels in the frame (negative_prompt wasn't strong enough — strengthen and retry).
- Duplicate person appeared (strengthen negative_prompt, retry).
- First-pass lighting wildly wrong despite correct composition lighting block (retry with fresh seed once; if it persists, the lighting block needs clearer direction).

Converge auto-retries this task up to `maxTaskAttempts` (3). Use attempts for seed variation.

## PNG format (mandatory)

Nano-banana sometimes returns `image/jpeg` bytes. A `.png` file with JPEG
content fails Converge's `valid-png` output validator and stalls convergence.
After writing any image output, normalize it:

```bash
python scripts/to_png.py <output-path>
```

Do this for every image you write in this task. The helper is idempotent (valid
PNGs are re-saved as PNGs).
