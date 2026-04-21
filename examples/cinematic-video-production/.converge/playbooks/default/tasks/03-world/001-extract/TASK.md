---
id: 001-extract
title: Extract Locations from Screenplay
description: Parse scene headings from screenplay.fountain and emit locations.json.
inputs:
  - screenplay.fountain
  - story-bible.md
outputs:
  - locations.json
checks:
  - id: locations-json-exists
    cmd: test -s locations.json
    description: locations.json written
  - id: locations-json-valid
    cmd: node -e "JSON.parse(require('fs').readFileSync('locations.json','utf8'))"
    description: locations.json is valid JSON
  - id: locations-have-required-fields
    cmd: node -e "const L=require('./locations.json');for(const x of L){if(!x.id||!x.name||!x.description||!x.time_variants||!x.time_variants.length){process.exit(1)}}"
    description: Every location has id, name, description, time_variants
---

# Extract Locations

Walk every `INT.`/`EXT.` scene heading in `screenplay.fountain`. Each unique location (ignoring time-of-day) becomes one entry in `locations.json`.

## Rules

- `id`: kebab-case slug derived from the location name (e.g. `lighthouse-lantern-room`, `cottage-kitchen`).
- `name`: human-readable name as it appears in scene headings.
- `description`: **≤ 60 words**, locked. Concrete architectural/geographic features. No weather, no time-of-day, no mood. Example: *"Circular lantern room atop a stone lighthouse. Copper-framed windows 360°. Central brass Fresnel lens on iron gimbal. Narrow iron staircase descends through a trapdoor in the plank floor."*
- `time_variants`: every time-of-day this location appears at. One of `day | golden-hour | dusk | night | dawn | overcast`. Pull from the scene headings.
- `props`: recurring on-set props that must stay consistent (e.g. `["brass compass on wall hook", "oilskin coat on peg"]`). Optional but recommended.

## Deduplication

If the screenplay says `INT. LIGHTHOUSE - LANTERN ROOM - NIGHT` in one scene and `INT. LIGHTHOUSE - LANTERN ROOM - DAWN` in another, that is ONE location with two time_variants, not two locations.

## Output

Array matching `schemas/locations.schema.json`, written to `locations.json`.
