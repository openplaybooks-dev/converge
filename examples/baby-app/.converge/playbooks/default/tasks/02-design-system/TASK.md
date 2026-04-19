---
id: 02-design-system
title: Design System
description: Generate design system and produce design references
blocking: true
dependencies:
  - 01-prepare-requirements
outputs:
  - .stitch/system/DESIGN.md
  - .stitch/system/META.md
  - .stitch/system/single-screen.html
  - .stitch/system/multi-state-screen.html
  - .stitch/system/celebration-screen.html
checks:
  - id: design-md-exists
    cmd: test -f .stitch/system/DESIGN.md
    description: Design system specification exists
  - id: meta-md-exists
    cmd: test -f .stitch/system/META.md
    description: META.md exists
---
# Design System

This epic sets up the design system:
1. Generate DESIGN.md (taste-design)
2. Generate design references (META.md + HTML)
