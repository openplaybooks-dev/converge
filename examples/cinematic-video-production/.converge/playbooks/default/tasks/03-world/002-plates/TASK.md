---
id: 002-plates
title: Generate Location Reference Plates
description: Per location, spawn a 5-step pipeline generating wide plate, detail plates, time-of-day variants, and a locked ref.json.
dependencies:
  - 001-extract
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
tags:
  - location
  - reference
  - image
inputs:
  - locations.json
  - story-bible.md
outputs:
  - locations/**/wide.png
  - locations/**/detail-*.png
  - locations/**/variant-*.png
  - locations/**/ref.json
checks:
  - id: at-least-one-location-ref
    cmd: find locations -name ref.json -type f | wc -l | awk '{if ($1 >= 1) exit 0; exit 1}'
    description: At least one location ref.json locked
  - id: every-location-has-ref
    cmd: node -e "const L=require('./locations.json');const fs=require('fs');for(const x of L){if(!fs.existsSync('locations/'+x.id+'/ref.json')){process.exit(1)}}"
    description: Every location has a locked ref.json
---

# Location Plates

Spawn a 5-step pipeline per location:

1. **01-description** — `locations/{id}/description.md` (expanded canon description).
2. **02-wide-plate** — Nano-banana → `locations/{id}/wide.png` (master wide, daylight, neutral weather).
3. **03-detail-plates** — 2-3 detail angles using the wide as reference → `locations/{id}/detail-{n}.png`.
4. **04-time-variants** — one image per time_variant in `locations.json` (uses wide as reference) → `locations/{id}/variant-{tod}.png`.
5. **05-lock** — emit `locations/{id}/ref.json`.
