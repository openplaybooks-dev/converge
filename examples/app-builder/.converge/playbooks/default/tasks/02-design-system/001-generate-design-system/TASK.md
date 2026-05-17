---
id: 001-generate-design-system
title: Generate Design System
description: Write the design system specification with themes, typography, spacing, surfaces, and motion language
blocking: true
skills:
  - taste-design
inputs:
  - .stitch/UX.md
  - .stitch/screens.json
outputs:
  - .stitch/system/DESIGN.md
checks:
  - id: design-exists
    cmd: test -f .stitch/system/DESIGN.md
    description: DESIGN.md exists
  - id: design-has-content
    cmd: "test $(wc -l < .stitch/system/DESIGN.md) -gt 80"
    description: DESIGN.md is substantial
---
# Generate Design System

Use the `taste-design` skill to create `.stitch/system/DESIGN.md`.

The design system must define:

- a named theme with light and dark modes
- expressive Google Fonts, excluding Inter and Roboto
- CSS-variable-friendly semantic color roles
- component styling for cards, buttons, chips, modals, filters, and hero sections
- a background image strategy that works with generated assets
- motion rules for transitions, reveals, hover, and press states

