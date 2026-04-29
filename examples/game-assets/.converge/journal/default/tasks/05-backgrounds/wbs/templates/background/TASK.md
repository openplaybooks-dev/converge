---
id: "{{bg_id}}-background"
title: "Generate {{bg_name}} parallax layer"
description: "{{bg_description}}"
outputs:
  - "assets/backgrounds/{{bg_id}}/{{bg_id}}.png"
  - "assets/backgrounds/{{bg_id}}/{{bg_id}}.atlas.json"
  - "assets/backgrounds/{{bg_id}}/{{bg_id}}.prompt.txt"
checks:
  - id: background-png-matches-resolution
    cmd: |
      python -c "from PIL import Image; im=Image.open('assets/backgrounds/{{bg_id}}/{{bg_id}}.png'); assert im.size==({{bg_width}}, {{bg_height}}), f'expected ({{bg_width}}, {{bg_height}}), got {im.size}'"
    description: Background PNG dimensions equal the manifest resolution
  - id: background-atlas-exists
    cmd: test -s assets/backgrounds/{{bg_id}}/{{bg_id}}.atlas.json
    description: Background atlas JSON exists
  - id: background-prompt-saved
    cmd: test -s assets/backgrounds/{{bg_id}}/{{bg_id}}.prompt.txt
    description: Sibling .prompt.txt exists for debugging
tags:
  - background
  - parallax
  - "{{parallax_layer}}"
---

# {{bg_name}} ({{parallax_layer}} layer)

Runs `scripts/generate_background_layer.py {{bg_id}}`. **One image-gen call** at the manifest's full resolution ({{bg_width}}×{{bg_height}}).

Outputs land in `assets/backgrounds/{{bg_id}}/`:
- `{{bg_id}}.png` — the full-resolution layer
- `{{bg_id}}.atlas.json` — trivial single-frame atlas (one rectangle covering the full sheet) so master-atlas aggregation finds it
- `{{bg_id}}.prompt.txt` — the prompt sent to the model
- `{{bg_id}}.seed.txt` — the seed used

Mid and near layers should produce alpha-keyable backgrounds (sky pixels solid `#7EB6FF` for downstream chroma keying), per the palette_constraints in `backgrounds.json`. The far layer can be fully opaque.

To debug, `cat` the prompt or re-run with a different seed: `python scripts/generate_background_layer.py {{bg_id}} --seed N`.
