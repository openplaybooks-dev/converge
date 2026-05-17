---
id: 002-generate-design-references
title: Generate Design References
description: Produce HTML design references that encode the visual direction for later React conversion
blocking: true
depends_on:
  - 001-generate-design-system
skills:
  - stitch-generate-web
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
outputs:
  - .stitch/system/META.md
  - .stitch/system/landing-reference.html
  - .stitch/system/content-reference.html
checks:
  - id: meta-exists
    cmd: test -f .stitch/system/META.md
    description: META.md exists
  - id: landing-reference-exists
    cmd: test -f .stitch/system/landing-reference.html
    description: landing reference exists
  - id: content-reference-exists
    cmd: test -f .stitch/system/content-reference.html
    description: content reference exists
---
# Generate Design References

Create:

- `.stitch/system/META.md` summarizing the chosen visual motifs
- `.stitch/system/landing-reference.html`
- `.stitch/system/content-reference.html`

These references should be static HTML/CSS only. They exist to lock visual taste, background layering, card rhythm, and motion cues before React conversion.

