---
id: 02-journeys
title: User Journeys
description: Map key user journeys and flows
blocking: true
depends_on:
  - 02-personas
inputs:
  - docs/product/research/user-personas.md
outputs:
  - docs/product/USER_JOURNEYS.md
checks:
  - id: journeys-exists
    cmd: test -f docs/product/USER_JOURNEYS.md
skills:
  - journey-mapping
---

# User Journeys

Write USER_JOURNEYS.md.