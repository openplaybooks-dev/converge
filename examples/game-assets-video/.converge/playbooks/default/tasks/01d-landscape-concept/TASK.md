---
title: Landscape Concept
description: Render one painterly landscape concept image per biome. Locks each biome's atmosphere, palette, and form vocabulary in a binding visual reference attached to every painted scene of that biome.
dependencies:
  - "01-art-bible"
  - "01b-style-sheet"
inputs:
  - "idea.md"
  - "assets/ART_BIBLE.md"
  - "assets/game.json"
  - "assets/concept/style-sheet.png"
  - "assets/concept/hero-shot.png"
  - "assets/visual-target.png"
outputs:
  - "assets/concept/landscape-{biome}.png"
checks:
  - id: landscape-concept-exists
    cmd: |
      python -c "
      import json
      from pathlib import Path
      try:
          game = json.loads(Path('assets/game.json').read_text())
      except FileNotFoundError:
          game = {}
      biomes = game.get('biomes')
      if isinstance(biomes, list) and biomes:
          biomes = [str(b) if isinstance(b, str) else str(b.get('id')) for b in biomes]
      else:
          tm = game.get('asset_categories', {}).get('tilemap', {}).get('variants', [])
          biomes = [str(t.get('id') or t) for t in tm] if tm else ['grassland']
      missing = [b for b in biomes if not Path(f'assets/concept/landscape-{b}.png').exists()]
      assert not missing, f'missing landscape concept(s): {missing} — run scripts/generate_landscape_concept.py'
      "
    description: Every biome has a compiled landscape-{biome}.png concept image
  - id: landscape-concept-has-min-size
    cmd: |
      python -c "
      from pathlib import Path
      from PIL import Image
      for p in Path('assets/concept').glob('landscape-*.png'):
          im = Image.open(p)
          w, h = im.size
          assert w >= 1024 and h >= 512, f'{p} too small: {im.size}'
      "
    description: Every landscape-{biome}.png is at least 1024×512
tags:
  - planning
  - landscape-concept
---

# 01d-landscape-concept — Per-Biome Landscape Concept Art

Generate one painterly landscape concept image per biome. Each image
is a wide establishing shot (no characters, no UI, no gameplay tokens)
that locks the biome's atmosphere, palette, and form vocabulary in a
binding visual reference. Downstream scene-mapping authoring attaches
this image so the AI sees the biome's actual painted target instead
of just text style rules.

This task runs **once per game** and is cached per biome — biomes
whose `assets/concept/landscape-{biome}.png` already exists are
skipped on subsequent runs.

## Workflow

```bash
python3 scripts/generate_landscape_concept.py
```

The script:

1. Reads `assets/game.json` to discover declared biomes (falls back to
   `["grassland"]` if no biome list is present).
2. For each biome whose `assets/concept/landscape-{biome}.png` does
   not exist:
   - Builds a prompt from `idea.md`, `assets/ART_BIBLE.md`, and the
     project's art-style preset.
   - Calls image-edit with `style-sheet.png` (primary), `hero-shot.png`,
     and `visual-target.png` as references.
   - Writes the 1536×1024 PNG plus sidecar `.prompt.txt` and `.seed.txt`.

Every paid AI call is gated through `lib.budget.charged` — pre-flight
spending cap + refund on exception.

## Why a separate task

The style-sheet (01b) shows the project's rendering vocabulary on
isolated subjects (props + tiles). The landscape concept shows the
same vocabulary applied to a full scene composition. Both feed
downstream painting, but they answer different questions:

- **style-sheet**: "what does a brush stroke look like in this project?"
- **landscape-concept**: "what does a painted scene of this biome
  look like, end-to-end?"

When a per-scene painter sees both anchors, finished scenes converge
on a coherent style AND a coherent biome atmosphere.

## Cost

≈1 image-gen call per biome (~5¢ on Gemini 2.5 Flash Image).
Validation is free.

## Re-rendering

To re-render a biome's landscape concept, delete its
`assets/concept/landscape-{biome}.png` and re-run, or pass `--force`.
