---
title: "Spec — {{title}}"
description: Generate the route-level specification for {{title}}
blocking: true
skills:
  - react-building-layouts
vars:
  screenId:
  title:
  route:
  componentName:
  specPath:
inputs:
  - .stitch/UX.md
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/assets/manifest.json
outputs:
  - "{{specPath}}"
checks:
  - id: spec-exists
    cmd: "test -f {{specPath}}"
    description: spec exists
---
# Screen Spec

Write `{{specPath}}` for the `{{title}}` page at route `{{route}}`.

The spec must include:

- page goal and narrative role
- sections and layout order
- background treatment
- referenced hero/background assets
- displayed data and interactions
- motion cues
- accessibility notes
- anti-patterns to avoid

