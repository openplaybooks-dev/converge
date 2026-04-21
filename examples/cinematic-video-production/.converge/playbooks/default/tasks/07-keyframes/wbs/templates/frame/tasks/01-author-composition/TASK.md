---
id: "{{pipelineId}}-01-author-composition"
title: "Author composition — {{shotId}} {{frame}}"
description: Write the declarative composition.json for the {{frame}} frame of shot {{shotId}}.
tags:
  - keyframe
  - composition
  - author
inputs:
  - shots.json
  - "scenes/{{sceneId}}/state.json"
  - characters/**/ref.json
  - locations/**/ref.json
  - style-guide.md
  - palette.json
outputs:
  - "{{compositionPath}}"
checks:
  - id: composition-exists
    cmd: test -s {{compositionPath}}
    description: composition.json written
  - id: composition-valid
    cmd: python scripts/validate_composition.py {{compositionPath}}
    description: composition.json passes schema + ref checks
---

# Author composition — {{shotId}} {{frame}}

Produce `{{compositionPath}}` matching `schemas/composition.schema.json`.

## Inputs you MUST read

- `shots.json` → the shot record for `{{shotId}}` (action, shot_type, character_ids_in_frame, wardrobe_refs, location_ref, dialogue, mood, camera_move, lens_mm).
- `scenes/{{sceneId}}/state.json` → time_of_day, weather, lighting_notes, carried_props, what each character is wearing and doing.
- For every character in frame: their `characters/{id}/ref.json` (pick the wardrobe variant the scene calls for).
- For the location: `locations/{{locationId}}/ref.json` (pick the variant `{{locationVariant}}`).
- `style-guide.md` for lens / framing conventions, `palette.json` for color.

## Composition rules

- **Canvas**: match `style-guide.md` aspect ratio. Default 2520×1080 (21:9).
- **Base**: use the location variant image as `base.ref`.
- **Elements**:
  - One entry per character in frame. `type: "character"`. `ref` is the wardrobe-variant image from their `ref.json`.
  - One entry per important prop named in the scene state's `carried_props` / `props_in_scene` that must be visible in this shot. `type: "prop"`. `ref` is the closest detail image from the location's `ref.json`, or a character's prop-specific reference if one exists.
  - Normalize positions to canvas: `x,y,width,height` are all 0.0–1.0. Use shot-type conventions:
    - `ews`/`ws`: characters 0.3–0.5 height, centered or off-thirds.
    - `ms`: character 0.6–0.85 height, framed from hips up.
    - `mcu`: character 0.85–1.05 height (head + shoulders; may bleed past canvas top).
    - `cu`: character 1.0–1.4 height (face fills).
    - `ots`: shoulder of foreground character at z=20, subject at z=10.
  - `z_order`: unique integer per element. Background props low (1–9), mid-ground characters (10–19), foreground overlays (20+).
  - `pose_hint`: natural-language pose for THIS frame — what is the character doing at this specific moment. For `{{frame}}` frame:
    - `start`: the pose AT the start of the clip (beginning of action).
    - `end`: the pose AT the end of the clip (action completed).
- **Lighting**: fill `lighting.key_source`, `key_direction`, `key_color`, `contrast`, drawing from `scenes/{{sceneId}}/state.json` lighting notes.
- **Motion intent** (ONLY on `end` frame): fill `motion_intent.summary` describing what changed since start, list `elements_that_move` by id.
- **Blend prompt**: one short paragraph of cinematic direction for Nano-banana. Reference the action, mood, and palette — not the layout (layout is handled by coordinates + blueprint).

## Example — start frame for a mid-shot

```json
{
  "version": 1,
  "shot_id": "{{shotId}}",
  "frame": "{{frame}}",
  "canvas": { "width": 2520, "height": 1080, "aspect_ratio": "21:9" },
  "base": { "ref": "locations/lighthouse-lantern-room/variant-night.png", "fit": "cover" },
  "elements": [
    {
      "id": "elias-thorn",
      "type": "character",
      "ref": "characters/elias-thorn/wardrobe-storm-gear.png",
      "x": 0.38, "y": 0.30, "width": 0.24, "height": 0.60,
      "z_order": 10,
      "pose_hint": "kneeling at the base of the lamp, right hand reaching for the oil reservoir, eyes fixed on the extinguished wick"
    }
  ],
  "lighting": {
    "key_source": "moonlight through north window at (0.15, 0.2)",
    "key_direction": "camera-right to camera-left",
    "key_color": "#A8C8E8 (cool pale blue)",
    "ambient": "deep blue interior at -2 stops",
    "contrast": "high"
  },
  "blend_prompt": "Mid-shot, 40mm anamorphic. Cold storm-night interior. Elias kneels at the base of the dark lamp, the moment before he tries to relight it. Breath visible. Wet oilskin catches the moonlight.",
  "negative_prompt": "no text, no watermark, no duplicate characters, no camera crew"
}
```

## Rules

- NEVER invent elements — every `ref` path must already exist on disk from 02-cast or 03-world.
- NEVER change a character's `visual_description` or wardrobe variant — wardrobe must match what `scenes/{{sceneId}}/state.json` says they are wearing.
- Keep the JSON minimal. Only include elements that are in frame.
- Validate with: `python scripts/validate_composition.py {{compositionPath}}`.
