---
id: 004-breakdown-ux-to-screens
title: Breakdown UX To Screens
description: Convert the UX document into a route and screen registry for dynamic screen generation
blocking: true
depends_on:
  - 003-generate-ux
skills:
  - ux-breakdown
inputs:
  - PRD.md
  - .stitch/UX.md
outputs:
  - .stitch/screens.json
  - .stitch/SITE.md
checks:
  - id: screens-json-exists
    cmd: test -f .stitch/screens.json
    description: screens.json exists
  - id: site-md-exists
    cmd: test -f .stitch/SITE.md
    description: SITE.md exists
---
# Breakdown UX To Screens

Read `.stitch/UX.md` and emit:

- `.stitch/screens.json` as an array of route-level screen objects
- `.stitch/SITE.md` as a concise site architecture summary

Every screen object must include:

- `id`
- `title`
- `route`
- `purpose`
- `backgroundStyle`
- `heroAssetIds`
- `interactions`

Only include route-level screens in `screens.json`. Shared widgets and modal-only elements belong in specs later, not as top-level routes.

