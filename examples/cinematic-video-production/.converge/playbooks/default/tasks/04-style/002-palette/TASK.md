---
id: 002-palette
title: Define Color Palette
description: Emit palette.json (hex tokens) and palette.png (visual strip) as color canon for the film.
dependencies:
  - 001-visual
skills:
  - image-generate
inputs:
  - style-guide.md
  - story-bible.md
outputs:
  - palette.json
  - palette.png
checks:
  - id: palette-json-exists
    cmd: test -s palette.json
    description: palette.json written
  - id: palette-png-exists
    cmd: test -s palette.png
    description: palette.png written
  - id: palette-json-valid
    cmd: node -e "const p=require('./palette.json');for(const k of ['shadows','midtones','highlights','accent']){if(!p[k]){process.exit(1)}}"
    description: palette.json has shadows/midtones/highlights/accent
---

# Define Color Palette

## Step 1 — palette.json

Produce `palette.json`:

```json
{
  "name": "<palette name, e.g. 'Atlantic Overcast'>",
  "shadows": ["#0F1418", "#1A2228"],
  "midtones": ["#3A4650", "#6B7A82"],
  "highlights": ["#C8CFD1", "#E5E5DE"],
  "skin_protect": ["#C4A891", "#E0C2A6"],
  "accent": ["#C97342"],
  "forbidden": ["neon", "pure-saturated primaries"],
  "notes": "Desaturated cold palette with a single warm accent (lighthouse lamp glow). Skin tones protected."
}
```

## Step 2 — palette.png

Call `image-generate` to produce a visual swatch strip at `palette.png`:

```
skills/image-generate {
  prompt: "Color palette strip. Four rows: shadows, midtones, highlights, accent. Hex values labeled beneath each swatch. Flat swatches, no gradients. Background neutral grey. Labeled '<palette name>'. <inject hex values>",
  references: [],
  aspect_ratio: "16:9",
  seed: "auto"
}
```

## Rules

- Pull mood from `style-guide.md` and `story-bible.md`.
- Accent colors should earn their place — usually 1-2 only, story-motivated.
- Skin tones must be protected: name the range of hues allowed on faces.

## PNG format (mandatory)

Nano-banana sometimes returns `image/jpeg` bytes. A `.png` file with JPEG
content fails Converge's `valid-png` output validator and stalls convergence.
After writing any image output, normalize it:

```bash
python scripts/to_png.py <output-path>
```

Do this for every image you write in this task. The helper is idempotent (valid
PNGs are re-saved as PNGs).
