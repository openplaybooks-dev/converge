---
id: 003-continuity-state
title: Precompute Per-Scene Continuity State
description: Walk shots.json in order and emit scenes/{id}/state.json for each scene — a snapshot of who's wearing what, what time-of-day, and what props are in play. Every shot prompt pulls from its scene's state.json.
dependencies:
  - 002-shots
inputs:
  - shots.json
  - scenes.json
  - characters.json
  - locations.json
outputs:
  - scenes/**/state.json
checks:
  - id: state-files-exist
    cmd: find scenes -name state.json -type f | wc -l | awk '{if ($1 >= 1) exit 0; exit 1}'
    description: At least one scene/state.json written
  - id: every-scene-has-state
    cmd: node -e "const s=require('./scenes.json');const fs=require('fs');for(const x of s){if(!fs.existsSync('scenes/'+x.id+'/state.json')){process.exit(1)}}"
    description: Every scene has a state.json
---

# Precompute Continuity State

The point of this task is to flag continuity errors **before** any expensive generation runs. The state file also saves every downstream shot prompt from re-deriving context.

## For each scene, emit `scenes/{scene_id}/state.json`:

```json
{
  "scene_id": "sc-003",
  "location_ref": {
    "location_id": "lighthouse-lantern-room",
    "variant": "night"
  },
  "time_of_day": "night",
  "weather": "storm",
  "characters_present": [
    {
      "character_id": "elias-thorn",
      "wardrobe_variant": "storm-gear",
      "emotional_state": "resolved fear",
      "injuries_or_marks": null,
      "carried_props": ["storm lamp (lit)", "brass compass"]
    }
  ],
  "props_in_scene": ["lit brass Fresnel lens", "wind-shattered window glass on floor"],
  "lighting_notes": "Lamp flicker at 0.5Hz throughout scene. Storm lightning flash every ~12s as motivated light.",
  "prior_scene_continuity": {
    "from_scene_id": "sc-002",
    "notes": "Elias entered with storm-gear already on. Window was intact in sc-002; breaks at start of sc-003."
  }
}
```

## Rules

- Walk scenes in `order`. Carry forward state from the previous scene where the story doesn't explicitly change it.
- For every character present, look up their wardrobe variant for this scene from the shots. All shots in a scene should agree on wardrobe — if they don't, flag as a continuity error.
- `location_ref.variant` must exist in that location's `ref.json`.
- Emit a top-level `scenes/continuity-errors.json` if any conflicts are found, with severity and description.
