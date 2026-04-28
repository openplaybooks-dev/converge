---
id: "scene-{{scene_id}}-05-manifest"
title: "Scene `{{scene_id}}` — manifest"
description: "Walk on-disk outputs and emit `scene.json` + update REGISTRY scenes_using[]."
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/scenes/{{scene_id}}/tilesheet/tilesheet.atlas.json"
outputs:
  - "assets/scenes/{{scene_id}}/scene.json"
checks:
  - id: scene-manifest-has-id
    cmd: |
      python -c "import json; m=json.load(open('assets/scenes/{{scene_id}}/scene.json')); assert m['id']=='{{scene_id}}', f'wrong id: {m.get(\"id\")}'"
    description: scene.json id matches scene_id
tags:
  - scene
  - "{{scene_id}}"
  - manifest
---

# Scene `{{scene_id}}` — Manifest

Runs `python scripts/build_scene_manifest.py {{scene_id}}`. Pure read — no image-gen. Walks `assets/scenes/{{scene_id}}/` and collects:

- concept image + SPEC paths
- per-layer background atlases
- tilesheet atlas (if present)
- per-prop atlases (every state directory)
- character + shared-prop IDs referenced by this scene (from `scenes.json`)

Then appends `{{scene_id}}` to `scenes_using[]` of every REGISTRY entry referenced by the scene, so the master atlas knows which scenes use which shared assets.
