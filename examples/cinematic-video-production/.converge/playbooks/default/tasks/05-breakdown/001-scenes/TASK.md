---
id: 001-scenes
title: Extract Scenes
description: Parse screenplay.fountain into scenes.json — one entry per scene heading.
inputs:
  - screenplay.fountain
  - characters.json
  - locations.json
outputs:
  - scenes.json
checks:
  - id: scenes-exists
    cmd: test -s scenes.json
    description: scenes.json written
  - id: scenes-valid
    cmd: node -e "const s=require('./scenes.json');for(const x of s){if(!x.id||!x.order||!x.setting_location_id||!x.time_of_day||!x.beat){process.exit(1)}}"
    description: Every scene has required fields
  - id: scenes-reference-known-locations
    cmd: node -e "const s=require('./scenes.json');const L=new Set(require('./locations.json').map(x=>x.id));for(const x of s){if(!L.has(x.setting_location_id)){console.error('Unknown location: '+x.setting_location_id);process.exit(1)}}"
    description: Every scene references a known location_id
---

# Extract Scenes

Walk the scene headings in `screenplay.fountain` in order. Produce `scenes.json` matching `schemas/scenes.schema.json`.

## Rules

- `id`: `sc-001`, `sc-002`, … in screenplay order.
- `order`: integer, matches the numeric suffix on `id`.
- `setting_location_id`: must match a `locations.json` `id`. Look up by matching the scene heading.
- `time_of_day`: one of the enum values. Normalize:
  - `DAY` → `day`
  - `NIGHT` → `night`
  - `DAWN` → `dawn`
  - `DUSK` / `TWILIGHT` → `dusk`
  - `GOLDEN HOUR` / `MAGIC HOUR` → `golden-hour`
  - `CONTINUOUS` → inherit from previous scene.
- `present_character_ids`: array of `characters.json` ids. Parse from action and dialogue in the scene body.
- `beat`: one-sentence summary of what happens. Pulled from `treatment.md` if available, else inferred.
- `emotional_tone`: one adjective.
- `weather`: one short string if the screenplay specifies, else omit.
