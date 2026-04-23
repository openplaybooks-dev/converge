---
id: "{{prefix}}-01-description"
title: "Description — {{locName}}"
description: Expand the locked location description with detail needed for plate generation.
tags:
  - location
  - description
inputs:
  - locations.json
  - story-bible.md
outputs:
  - "{{locDir}}/description.md"
checks:
  - id: description-exists
    cmd: test -s {{locDir}}/description.md
    description: Description file written
---

# Description — {{locName}}

Locked description (CANON, do not contradict):

> {{locDescription}}

## Task

Write `{{locDir}}/description.md` extending the locked description for image generation.

## Required sections

```markdown
# {{locName}} — Description

## Canon
{{locDescription}}

## Architectural / Geographic Detail
<Materials, construction, scale, geometry. Enough for an artist to draw.>

## Persistent Props
<Items that must appear in every plate and shot set here.>

## Lighting Geometry
<Where windows, sources, reflective surfaces are. Light behaves the same way every scene.>

## Weather/Atmosphere Baseline
<Default weather — what this place feels like on an average day.>

## What Must Stay Consistent
- <List items that must match pixel-for-pixel across shots: furniture placement, window count, wall color, etc.>
```

## Rules

- 150-250 words total.
- Never contradict the canon description.
- No time-of-day references here — those are per-variant.
