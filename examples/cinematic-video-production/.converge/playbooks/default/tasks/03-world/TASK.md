---
id: 03-world
title: World — Extract Locations, Generate Plates
description: Pull locations from the screenplay and generate locked reference plates (wide + detail + time-of-day variants).
dependencies:
  - 01-story
tags:
  - world
  - location
inputs:
  - screenplay.fountain
  - story-bible.md
outputs:
  - locations.json
  - locations/**/*.png
  - locations/**/ref.json
checks:
  - id: locations-json
    cmd: test -s locations.json
    description: locations.json written
  - id: location-refs-locked
    cmd: find locations -name ref.json -type f | wc -l  | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=1?0:1)"
    description: At least one location ref.json locked
---

# World

Mirror of 02-cast for locations. Extract → generate plates → lock references.

Locked plates are passed into keyframe/shot prompts so lighting, architecture, and geometry stay consistent across every shot set in the same place.
