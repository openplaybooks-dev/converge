---
title: "Design — {{title}}"
description: Create the static HTML design reference for {{title}}
blocking: true
skills:
  - stitch-generate-web
vars:
  screenId:
  title:
  route:
  specPath:
  metaPath:
  designPath:
inputs:
  - "{{specPath}}"
  - .stitch/system/DESIGN.md
outputs:
  - "{{metaPath}}"
  - "{{designPath}}"
checks:
  - id: design-exists
    cmd: "test -f {{designPath}}"
    description: design exists
---
# Screen Design

Create a static HTML/CSS reference at `{{designPath}}` and a concise rationale at `{{metaPath}}`.

The HTML should lock:

- composition
- typography hierarchy
- image placement
- hover/press states
- background layering

