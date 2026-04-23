---
id: 001-visual
title: Write Visual Style Guide
description: Lock cinematography rules — lens family, framing, lighting philosophy, camera movement vocabulary.
inputs:
  - story-bible.md
  - idea.md
outputs:
  - style-guide.md
checks:
  - id: style-guide-exists
    cmd: test -s style-guide.md
    description: style-guide.md written
  - id: style-guide-has-lens
    cmd: grep -qE '^## (Lens|Lenses)' style-guide.md
    description: Has lens section
---

# Write Visual Style Guide

Produce `style-guide.md` — the frozen cinematography bible. This file is injected verbatim into every keyframe and shot prompt.

## Required sections

```markdown
# Visual Style Guide

## One-Line Style Statement
<e.g. "Slow, patient, grain-forward anamorphic naturalism. Overcast Atlantic light.">

## Aspect Ratio
<e.g. 2.39:1 (anamorphic widescreen)>

## Lens
- Primary focal length: <e.g. 40mm anamorphic>
- Secondary: <e.g. 28mm for wides, 75mm for close-ups>
- Depth of field: <shallow | medium | deep — with reasoning>

## Lighting Philosophy
- Key: <source, quality, direction>
- Ambient: <overcast / practicals / both>
- Contrast ratio: <low | medium | high>
- Practicals: <always on / story-motivated only>
- What to avoid: <e.g. "no glamour lighting, no fill on faces">

## Framing Rules
- Headroom: <tight | neutral | loose>
- Rule of thirds vs. centered: <preference>
- Negative space: <importance>
- Handheld vs. locked: <when each>

## Camera Movement Vocabulary
Preferred: <listed — e.g. static, slow push-in, handheld drift>
Forbidden: <e.g. drone moves, crash zooms, whip pans>

## Film Stock / Look
- Grain: <fine | medium | heavy>
- Halation: <subtle | strong | none>
- Contrast curve: <s-curve | flat | vintage filmic>
- Reference films: <3-5 films whose look this mimics>

## Color Treatment
- Saturation: <desaturated | natural | punchy>
- Skin tone protection: <yes / no>
- Shadow tint: <e.g. cool teal>
- Highlight tint: <e.g. warm cream>
```

## Rules

- Pull tone cues from `story-bible.md` and any reference films named in `idea.md`.
- Be specific. "Cinematic" is not a style — "35mm anamorphic, overcast Atlantic daylight, subtle halation, 1980s Kodak Vision look" is a style.
- Total length: ≤ 400 words. This file is in every prompt — brevity matters.
