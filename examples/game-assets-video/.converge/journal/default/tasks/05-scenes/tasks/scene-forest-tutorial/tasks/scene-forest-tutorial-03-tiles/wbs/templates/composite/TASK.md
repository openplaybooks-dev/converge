---
id: "scene-{{scene_id}}-tilesheet"
title: "Scene `{{scene_id}}` — composite tilesheet"
description: "Composite per-tile PNGs into the scene tilesheet."
depends_on:
  - "tag:{{tile_batch_tag}}"
outputs:
  - "assets/scenes/{{scene_id}}/tilesheet/tilesheet.png"
  - "assets/scenes/{{scene_id}}/tilesheet/tilesheet.atlas.json"
checks:
  - id: scene-tilesheet-png-exists
    cmd: test -s assets/scenes/{{scene_id}}/tilesheet/tilesheet.png
    description: Composite tilesheet PNG exists
  - id: scene-tilesheet-atlas-exists
    cmd: test -s assets/scenes/{{scene_id}}/tilesheet/tilesheet.atlas.json
    description: Tilesheet atlas JSON exists
tags:
  - scene
  - "{{scene_id}}"
  - tilesheet
---

# Scene `{{scene_id}}` — composite tilesheet

Runs `python scripts/build_tilesheet.py {{scene_id}}-tilemap --scene-id {{scene_id}} --out-root assets/scenes/{{scene_id}}/tilesheet`. Pure pixel-paste, no image-gen — waits on every per-tile leaf in this scene via `tag:{{tile_batch_tag}}`.
