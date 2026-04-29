---
id: scene-forest-tutorial-02c-background-97-validate-composition
title: "Scene `forest-tutorial` — validate parallax composition (cross-layer)"
description: "Composite bg-far + bg-mid + bg-near and ask Gemini whether the three layers tell a coherent visual story. Catches cross-layer issues that per-layer validators miss: elevation mismatch, palette drift, content collision, blocking."
tags:
  - scene
  - forest-tutorial
  - background
  - validate
  - cross-layer
inputs:
  - assets/scenes/forest-tutorial/stage.json
  - assets/scenes/forest-tutorial/concept.png
  - assets/scenes/forest-tutorial/map.silhouette.png
  - assets/scenes/forest-tutorial/bg-far.png
  - assets/scenes/forest-tutorial/bg-mid.png
  - assets/scenes/forest-tutorial/bg-near.png
outputs:
  - assets/scenes/forest-tutorial/bg-composition.critique.json
  - assets/scenes/forest-tutorial/bg-composition.preview.png
checks:
  - id: bg-composition-critique-written
    description: cross-layer critique JSON was written
    cmd: test -s assets/scenes/forest-tutorial/bg-composition.critique.json
  - id: bg-composition-no-high-severity
    description: no layer was flagged with severity=high (low-severity issues are accepted)
    cmd: "python -c \"\nimport json\nc = json.load(open('assets/scenes/forest-tutorial/bg-composition.critique.json'))\nlayers = c.get('layers') or []\nhigh = [l for l in layers if l.get('decision') == 'fix' and l.get('severity') == 'high']\nif high:\n    tags = [(l.get('layer'), l.get('issues')) for l in high]\n    raise AssertionError(f'{len(high)} layer(s) flagged with severity=high: {tags}')\n\"\n"
vars:
  scene_id: forest-tutorial
---

# Scene `forest-tutorial` — cross-layer composition validate

## Role

You are a **paid-API operator**. Run the script and report its real result.

## What this does

Composites every per-layer stitched output into one image and asks Gemini to judge whether the three layers tell a coherent visual story together. Catches issues per-layer validators can't:

- **elevation-mismatch** — far horizon, mid silhouette base, and near foreground edge disagree on the ground line.
- **palette-drift** — saturation / hue jumps between layers.
- **content-collision** — mid silhouettes overlap the foreground edge or far peaks poke through mid.
- **style-drift** — line weight or shading style differs.
- **blocking** — a layer obscures the playable area.

If verdict is `pass`, this task succeeds and the run moves on.

If a layer is flagged with `severity=high`, the script deletes the layer's stitched PNG and clears its segment files; the runner re-runs the segment + stitch chain for that layer. The critique JSON is preserved so the next per-layer validator pass can read it.

## Run

```bash
python scripts/validate_bg_composition.py forest-tutorial
```

## Cost

- 1 text-out call per pass (~5¢).
- Each iteration that flags a layer adds N image-gen calls (one per segment) plus the per-layer validator + stitch.
