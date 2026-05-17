---
id: 01-prepare-requirements
title: Prepare Requirements
description: Validate the idea, write the PRD, define the UX, and extract screen definitions for a React web app
blocking: true
outputs:
  - PRD.md
  - .stitch/UX.md
  - .stitch/screens.json
  - .stitch/SITE.md
checks:
  - id: prd-exists
    cmd: test -f PRD.md
    description: PRD exists
  - id: ux-exists
    cmd: test -f .stitch/UX.md
    description: UX specification exists
  - id: screens-exist
    cmd: test -f .stitch/screens.json
    description: Screen definitions exist
---
# Prepare Requirements

Turn `idea.md` into the durable planning artifacts that downstream phases consume:

1. validate the concept and audience
2. write `PRD.md`
3. write `.stitch/UX.md`
4. extract `.stitch/screens.json` and `.stitch/SITE.md`

