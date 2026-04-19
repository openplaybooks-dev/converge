---
id: 01-prepare-requirements
title: Prepare Requirements
description: Validate app idea, generate PRD, generate UX specification, and extract screen definitions
blocking: true
outputs:
  - PRD.md
  - .stitch/UX.md
  - .stitch/screens.json
  - .stitch/SITE.md
checks:
  - id: ux-spec-exists
    cmd: test -f .stitch/UX.md
    description: UX specification exists
  - id: screens-json-exists
    cmd: test -f .stitch/screens.json
    description: Screen definitions exist
---
# Prepare Requirements

This epic gathers requirements and produces the foundational UX artifacts:
1. Validate app idea
2. Generate PRD
3. Generate UX overview
4. Breakdown UX to screens
