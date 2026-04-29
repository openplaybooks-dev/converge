---
title: Style Sheet
description: Render the universal style-anchor image used by every downstream prop, tile, and bg generator.
dependencies:
  - "01-art-bible"
outputs:
  - "assets/concept/style-sheet.png"
  - "assets/concept/style-sheet.prompt.txt"
  - "assets/concept/style-sheet.seed.txt"
checks:
  - id: style-sheet-exists
    cmd: test -s assets/concept/style-sheet.png
    description: assets/concept/style-sheet.png was generated
  - id: style-sheet-has-min-size
    cmd: |
      python -c "from PIL import Image; im=Image.open('assets/concept/style-sheet.png'); w,h=im.size; assert w>=1024 and h>=512, f'style-sheet too small: {im.size}'"
    description: style-sheet.png is at least 1024x512 (matches generator's 1536x1024 native output)
tags:
  - planning
  - style-anchor
---

# 01b-style-sheet — Universal Style Anchor

The single PNG that every downstream prop, tile, and bg generator
prepends as its first reference image. Locks the project's rendering
style on representative subjects (3 sample props + 3 sample tiles) so
the model sees the *same* visual vocabulary on every paid call instead
of re-interpreting a text-only style description per asset.

Without this anchor, parallel image-gen calls produce wildly inconsistent
output — a 3D-rendered metal spring, a photoreal stone trap, and a
cartoon potion all in the same project. With it, every call inherits
the exact line weight, palette, and shading model defined here.

## How it works

```bash
python3 scripts/generate_style_sheet.py
```

1. Reads `idea.md` + `assets/game.json` for the art-style preset.
2. Reads `assets/concept/hero-shot.png` and `assets/visual-target.png`
   as image references.
3. Picks 3 representative props (from `objects.json` if present,
   else generic samples) and 3 representative tiles (from
   `scenes.json[0].tilemap.tile_variants`, else generic).
4. One image-gen call produces a 1536×1024 sheet with a 3×2 cell grid
   showing the 6 subjects in the project's target style.
5. Writes `assets/concept/style-sheet.png` plus sidecar prompt/seed.

## Why a 6-cell sheet?

The model treats a single multi-cell canvas as one coherent rendering
job, so all 6 cells inherit the same brush, line weight, and palette.
Reusing this PNG as a reference on every downstream call gives the
model an unambiguous style cue with broad visual coverage (props +
tiles in one image).

## Cost

- 1 image-gen call (~5¢ on Gemini)

## Outputs

- `assets/concept/style-sheet.png` — universal anchor, 1536×1024
- `assets/concept/style-sheet.prompt.txt` — full prompt sent
- `assets/concept/style-sheet.seed.txt` — seed used for reproducibility
