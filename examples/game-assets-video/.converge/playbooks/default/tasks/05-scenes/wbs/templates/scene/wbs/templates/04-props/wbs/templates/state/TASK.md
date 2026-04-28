---
id: "scene-{{scene_id}}-prop-{{prop_id}}-{{state_name}}"
title: "Scene `{{scene_id}}` — `{{prop_id}}` {{state_name}} sheet"
description: "{{state_name}} spritesheet for scene-only prop `{{prop_id}}` in `{{scene_id}}`."
inputs:
  - "assets/scenes/{{scene_id}}/concept.png"
outputs:
  - "assets/scenes/{{scene_id}}/props/{{prop_id}}/spritesheets/{{state_name}}/{{state_name}}.png"
  - "assets/scenes/{{scene_id}}/props/{{prop_id}}/spritesheets/{{state_name}}/{{state_name}}.atlas.json"
checks:
  - id: scene-prop-png-exists
    cmd: test -s assets/scenes/{{scene_id}}/props/{{prop_id}}/spritesheets/{{state_name}}/{{state_name}}.png
    description: Scene-prop sheet PNG exists
  - id: scene-prop-atlas-exists
    cmd: test -s assets/scenes/{{scene_id}}/props/{{prop_id}}/spritesheets/{{state_name}}/{{state_name}}.atlas.json
    description: Scene-prop atlas JSON exists
tags:
  - scene
  - "{{scene_id}}"
  - prop
  - "{{obj_category}}"
  - spritesheet
---

# Scene `{{scene_id}}` — `{{prop_name}}` ({{state_name}})

Runs `python scripts/generate_prop_spritesheet.py {{prop_id}} {{state_name}} --scene-id {{scene_id}} --scene-concept assets/scenes/{{scene_id}}/concept.png --out-root assets/scenes/{{scene_id}}/props/{{prop_id}}`.

Prop is looked up in `scenes.json[{{scene_id}}].scene_props` (not the shared `objects-shared.json`). The scene concept is added as a secondary reference so palette and lighting match.
