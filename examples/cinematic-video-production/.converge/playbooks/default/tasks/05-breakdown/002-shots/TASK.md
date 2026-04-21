---
id: 002-shots
title: Break Scenes Down into Shots
description: For each scene, produce a director's shot list. Emit shots.json — the spine for all downstream generation.
dependencies:
  - 001-scenes
inputs:
  - screenplay.fountain
  - scenes.json
  - characters.json
  - locations.json
  - style-guide.md
outputs:
  - shots.json
checks:
  - id: shots-exists
    cmd: test -s shots.json
    description: shots.json written
  - id: shots-valid
    cmd: node -e "const s=require('./shots.json');for(const x of s){if(!x.id||!x.scene_id||!x.order||!x.shot_type||!x.duration_s||!x.action||!x.location_ref){process.exit(1)}}"
    description: Every shot has required fields
  - id: shots-reference-known-scenes
    cmd: node -e "const s=require('./shots.json');const S=new Set(require('./scenes.json').map(x=>x.id));for(const x of s){if(!S.has(x.scene_id)){process.exit(1)}}"
    description: Every shot references a known scene
  - id: shots-reference-known-chars
    cmd: node -e "const s=require('./shots.json');const C=new Set(require('./characters.json').map(x=>x.id));for(const x of s){for(const c of (x.character_ids_in_frame||[])){if(!C.has(c)){console.error('Unknown char: '+c);process.exit(1)}}}"
    description: Every character reference is known
  - id: shots-total-duration
    cmd: node -e "const s=require('./shots.json');const t=s.reduce((a,x)=>a+x.duration_s,0);const target=20*60;if(t<target*0.7||t>target*1.3){console.error('Total duration '+t+'s off target');process.exit(1)}"
    description: Total shot duration is within ±30% of target_duration_minutes
---

# Break Scenes Down into Shots

Walk `scenes.json` in order. For each scene, act as the director + DP and produce a shot list. All shots concatenated form `shots.json`.

## Shot list principles

- **Coverage over coverage-for-coverage's-sake.** Each shot must earn its place by adding information, emotion, or rhythm.
- **Lean toward longer takes.** AI video models handle 4-8 seconds well. Match the `style-guide.md` pacing.
- **Match the scene's emotional arc.** Start wider for establishment, tighten on emotional beats, release on resolution.
- **Consistency checks baked in.** Never invent a wardrobe or location the upstream phases didn't lock.

## Per-shot fields (see schemas/shots.schema.json)

- `id`: `sh-0001`, `sh-0002`, … global counter across all scenes.
- `scene_id`: parent scene.
- `order`: global order (matches id numeric).
- `shot_type`: `ews` | `ws` | `ms` | `mcu` | `cu` | `ecu` | `ots` | `pov` | `insert` | `two-shot`.
- `camera_move`: `static` | `pan` | `tilt` | `dolly-in` | `dolly-out` | `track` | `handheld` | `crane` | `push`.
- `lens_mm`: focal length integer (match `style-guide.md` preferences).
- `duration_s`: float. Target `vars.avg_shot_duration_s` as the mean. Range 2-12s.
- `action`: one-sentence description of what happens in-frame. Present tense.
- `dialogue`: array of `{ character_id, text }` for lines spoken during this shot.
- `sfx_cues`: short list of diegetic SFX (e.g. `["wind gust", "lamp ignition"]`).
- `character_ids_in_frame`: every character visible.
- `wardrobe_refs`: `{ character_id: wardrobe_variant_id }` — must match what that character is wearing in this scene, consistent with prior scenes.
- `location_ref`: `{ location_id, variant }` — variant is one of the time_variants or detail IDs from the location's `ref.json`.
- `mood`: one adjective.

## Hard caps

- Total shot count ≤ `vars.max_shots_hard_cap` (800). If you exceed, drop non-essential coverage.
- Sum of `duration_s` should land within ±30% of `target_duration_minutes * 60`.
