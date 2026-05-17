---
id: 002-generate-prd
title: Generate PRD
description: Write a PRD that defines the generated app's scope, feature set, and acceptance criteria
blocking: true
depends_on:
  - 001-gather-idea
inputs:
  - idea.md
  - .stitch/brief.md
outputs:
  - PRD.md
checks:
  - id: prd-exists
    cmd: test -f PRD.md
    description: PRD exists
  - id: prd-has-content
    cmd: "test $(wc -l < PRD.md) -gt 40"
    description: PRD is substantial
---
# Generate PRD

Write `PRD.md` for a frontend-only `Vite + React + TypeScript` application.

The PRD must explicitly include:

- user personas
- primary screens and routes
- mock-data scope
- theme and visual direction constraints
- required playful features
- persisted preference requirement
- routing, testing, and build acceptance criteria

Do not introduce backend or auth requirements.

