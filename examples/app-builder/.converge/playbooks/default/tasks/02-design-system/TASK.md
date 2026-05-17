---
id: 02-design-system
title: Design System
description: Define the visual language and create HTML design references for the generated React app
blocking: true
depends_on:
  - 01-prepare-requirements
outputs:
  - .stitch/system/DESIGN.md
  - .stitch/system/META.md
  - .stitch/system/landing-reference.html
  - .stitch/system/content-reference.html
checks:
  - id: design-exists
    cmd: test -f .stitch/system/DESIGN.md
    description: Design system exists
  - id: meta-exists
    cmd: test -f .stitch/system/META.md
    description: Design meta exists
---
# Design System

Set the visual direction for the app:

1. define the design system in prose
2. generate HTML references that embody the theme without React code

