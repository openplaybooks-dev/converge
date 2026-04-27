---
title: Visual Target Planner
description: Generate a reference screenshot from idea.md and derive ASSETS.md + JSON manifests from it.
outputs:
  - "assets/visual-target.png"
  - "ASSETS.md"
  - "assets/sprites.json"
checks:
  - id: visual-target-png-exists
    cmd: test -s assets/visual-target.png
    description: visual-target.png was generated
  - id: assets-md-has-size-column
    cmd: |
      python -c "import re; md=open('ASSETS.md').read(); rows=[l for l in md.splitlines() if l.startswith('|') and '---' not in l]; bad=[l for l in rows[1:] if not re.search(r'\\d+\\s*[xX×]\\s*\\d+', l)]; assert not bad, f'rows missing pixel sizes: {bad[:3]}'"
    description: Every ASSETS.md table row has a numeric Size column
  - id: sprites-json-derived
    cmd: test -s assets/sprites.json
    description: sprites.json was derived from ASSETS.md
tags:
  - planning
  - visual-target
---

# 00-visual-target — Visual-target-driven planner

Adapted from godogen's `visual-target.md` + `asset-planner.md`. Three sequential steps:

## 1. Generate the reference screenshot

```bash
python3 scripts/generate_visual_target.py
```

Reads `idea.md`, builds a "screenshot of an in-game frame" prompt enumerating every game object (player, enemies, props, HUD), excluding effects we won't actually build, and renders via Gemini image-gen. Writes `assets/visual-target.png` + sidecar prompt + seed.

The screenshot is the visual QA target — every distinct object visible here becomes an asset requirement downstream. Objects absent from the reference get forgotten.

## 2. Derive ASSETS.md

```bash
python3 scripts/generate_assets_md.py
```

Sends `idea.md` + `visual-target.png` to Gemini text and asks for a strict 5-section markdown table (Characters / Props / Backgrounds / Tile maps) with mandatory **Size** column per row. Sizes from the table populate `working_resolution` / `resolution` fields downstream.

Without explicit pixel sizes, scene-builders consistently scale things wrong. The Size column is enforced by the lint check below.

## 3. Derive the JSON manifests

```bash
python3 scripts/derive_manifests_from_assets_md.py
```

Parses `ASSETS.md` into the per-category JSON manifests (`assets/sprites.json`, `objects.json`, `backgrounds.json`, `tile_maps.json`) the rest of the playbook already consumes.

## Skip behavior

This task is **opt-in**. If you'd rather hand-author `assets/sprites.json` directly, skip 00 and go straight to 01-setup-art-style. The downstream pipeline doesn't care which produced the manifests — it just consumes them.

To opt out, remove `00-visual-target` from `playbook.yml` `tasks:` list (or set `vars.use_visual_target_planner: false` if the playbook supports the gate).

## Cost

- Step 1: 1× image-gen call (gemini ≈ 5¢, openai ≈ 4¢)
- Step 2: 1× text+image call (charged at image rate as a conservative proxy)
- Step 3: free (local parsing)

Total: ~10¢ on Gemini, ~8¢ on OpenAI.
