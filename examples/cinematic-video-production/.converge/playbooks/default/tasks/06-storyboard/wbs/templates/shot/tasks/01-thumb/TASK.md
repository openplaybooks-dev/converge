---
id: "{{shotId}}"
title: "Thumb — {{shotId}} ({{shotType}}, {{sceneId}})"
description: Generate a low-detail storyboard thumbnail for shot {{shotId}}.
skills:
  - image-generate
tags:
  - storyboard
  - thumbnail
inputs:
  - shots.json
outputs:
  - "storyboard/{{shotId}}.png"
checks:
  - id: thumb-exists
    cmd: test -s storyboard/{{shotId}}.png
    description: Thumbnail generated
---

# Storyboard Thumb — {{shotId}}

## Prompt

```
Storyboard thumbnail, pencil-sketch aesthetic, loose and quick.

Shot: {{shotId}} ({{shotType}}), camera {{cameraMove}}.
Scene: {{sceneId}}. Location: {{locationId}} ({{locationVariant}}).
Characters in frame: {{charactersInFrame}}.

Action: {{action}}
Mood: {{mood}}

Indicate composition, framing, and blocking only. No fine detail on face or wardrobe.
Black-and-white, pencil-on-paper look. Frame edges drawn as a rectangle.

Aspect ratio: 21:9.
```

## Call

```
skills/image-generate {
  prompt: <above>,
  references: [],
  aspect_ratio: "21:9",
  seed: "auto",
  quality: "draft"
}
```

Write to `storyboard/{{shotId}}.png`.

## Rule

This is a composition sketch. Do NOT burn budget on photorealism here — the next phase (07-keyframes) generates the real first frame with full reference fidelity.

## PNG format (mandatory)

Nano-banana sometimes returns `image/jpeg` bytes. A `.png` file with JPEG
content fails Converge's `valid-png` output validator and stalls convergence.
After writing any image output, normalize it:

```bash
python scripts/to_png.py <output-path>
```

Do this for every image you write in this task. The helper is idempotent (valid
PNGs are re-saved as PNGs).
