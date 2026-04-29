---
id: "scene-{{scene_id}}-02c-background-97-validate-composition"
title: "Scene `{{scene_id}}` — validate parallax composition (cross-layer)"
description: "Composite bg-far + bg-mid + bg-near and ask Gemini whether the three layers tell a coherent visual story. Catches cross-layer issues that per-layer validators miss: elevation mismatch, palette drift, content collision, blocking."
inputs:
  - "assets/scenes/{{scene_id}}/stage.json"
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/scenes/{{scene_id}}/map.silhouette.png"
  - "assets/scenes/{{scene_id}}/bg-far/final.png"
  - "assets/scenes/{{scene_id}}/bg-mid/final.png"
  - "assets/scenes/{{scene_id}}/bg-near/final.png"
outputs:
  - "assets/scenes/{{scene_id}}/bg-composition.critique.json"
  - "assets/scenes/{{scene_id}}/bg-composition.preview.png"
checks:
  - id: bg-composition-critique-written
    cmd: test -s assets/scenes/{{scene_id}}/bg-composition.critique.json
    description: cross-layer critique JSON was written
  - id: bg-composition-no-high-severity
    cmd: |
      python -c "
      import json
      c = json.load(open('assets/scenes/{{scene_id}}/bg-composition.critique.json'))
      layers = c.get('layers') or []
      high = [l for l in layers if l.get('decision') == 'fix' and l.get('severity') == 'high']
      if high:
          tags = [(l.get('layer'), l.get('issues')) for l in high]
          raise AssertionError(f'{len(high)} layer(s) flagged with severity=high: {tags}')
      "
    description: no layer was flagged with severity=high (low-severity issues are accepted)
tags:
  - scene
  - "{{scene_id}}"
  - background
  - validate
  - cross-layer
---

# Scene `{{scene_id}}` — cross-layer composition validate

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
python scripts/validate_bg_composition.py {{scene_id}}
```

## Cost

- 1 text-out call per pass (~5¢).
- Each iteration that flags a layer adds N image-gen calls (one per segment) plus the per-layer validator + stitch.
