---
id: 003-generate-ux
title: Generate UX
description: Produce the UX specification for a visual, image-rich React app
blocking: true
depends_on:
  - 002-generate-prd
skills:
  - ux-design
inputs:
  - PRD.md
outputs:
  - .stitch/UX.md
checks:
  - id: ux-exists
    cmd: test -f .stitch/UX.md
    description: UX document exists
  - id: ux-has-content
    cmd: "test $(wc -l < .stitch/UX.md) -gt 60"
    description: UX document is substantial
---
# Generate UX

Use the `ux-design` skill to write `.stitch/UX.md`.

The result must think natively in web application terms:

- route-level pages, not mobile scaffolds
- page transitions, reveal motion, sticky chrome, modal layers
- background imagery strategy per screen
- playful interactions per screen
- data and state expectations

