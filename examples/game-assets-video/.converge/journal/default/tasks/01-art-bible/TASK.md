---
title: Art Bible
description: Derive ART_BIBLE.md and a concept hero-shot from idea.md + visual-target.png. Anchors visual consistency for every downstream asset.
dependencies:
  - "00-visual-target"
outputs:
  - "assets/ART_BIBLE.md"
  - "assets/concept/hero-shot.png"
checks:
  - id: art-bible-exists
    cmd: test -s assets/ART_BIBLE.md
    description: ART_BIBLE.md was written
  - id: art-bible-has-palette
    cmd: |
      python -c "import re; md=open('assets/ART_BIBLE.md').read(); assert re.search(r'#[0-9a-fA-F]{6}', md), 'no #RRGGBB hex codes in ART_BIBLE.md'"
    description: ART_BIBLE.md has at least one #RRGGBB palette entry
  - id: hero-shot-exists
    cmd: test -s assets/concept/hero-shot.png
    description: concept hero-shot was generated
tags:
  - planning
  - art-bible
---

# 01-art-bible — Art Bible & Concept Hero-Shot

The bible is the **structured visual contract** every downstream asset prompt inherits. Without it each asset is a one-shot interpretation of a string-level "art_style" preset, and assets drift visually. With it, generators have multiple anchor points (visual-target screenshot + ART_BIBLE.md text + concept hero-shot image) and outputs stay coherent.

Two sequential steps:

## 1. Derive ART_BIBLE.md

```bash
python3 scripts/generate_art_bible.py
```

Sends `idea.md` + `assets/visual-target.png` to Gemini text and asks for a strict markdown spec:
- Palette (5–8 dominant colors with #RRGGBB hex)
- Line / shading rules
- Character proportions
- Environment & form language
- Negatives (specific things to avoid)

Sampled hex values come **from the visual-target image** (no invented colors). The mandatory `#RRGGBB` format is enforced by the lint check below.

## 2. Generate concept hero-shot

```bash
python3 scripts/generate_concept_hero_shot.py
```

Renders one 16:9 mid-gameplay frame that demonstrates the bible. This image becomes the **secondary visual anchor** for every per-scene concept (primary anchor = visual-target.png). Saves to `assets/concept/hero-shot.png` + sidecar prompt/seed.

## Outputs

- `assets/ART_BIBLE.md` — text spec, ~1–2 KB, fed into every per-asset prompt
- `assets/concept/hero-shot.png` — visual demo, 16:9 ~1024 wide
- `assets/concept/hero-shot.prompt.txt` + `.seed.txt` — sidecars

## Cost

- Step 1: 1 text-out call (~5¢ proxy via budget gate)
- Step 2: 1 image-gen call (~5¢ Gemini)

Total: ~10¢.
