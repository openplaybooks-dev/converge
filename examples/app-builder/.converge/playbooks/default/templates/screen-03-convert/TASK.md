---
title: "Convert — {{title}}"
description: Convert the screen design to React code for {{title}}
blocking: true
skills:
  - react-building-layouts
  - react-animating-apps
vars:
  screenId:
  title:
  route:
  componentName:
  specPath:
  designPath:
  screenPath:
inputs:
  - "{{specPath}}"
  - "{{designPath}}"
  - src/content/assets.ts
  - src/theme/theme.css
outputs:
  - "{{screenPath}}"
checks:
  - id: screen-exists
    cmd: "test -f {{screenPath}}"
    description: screen exists
---
# Convert Screen To React

Create `{{screenPath}}` as a route-level React component.

Requirements:

- TypeScript React component
- Tailwind classes plus theme variables
- motion where the spec calls for it
- import generated assets instead of hardcoding placeholder image URLs
- no fake buttons or inert controls

