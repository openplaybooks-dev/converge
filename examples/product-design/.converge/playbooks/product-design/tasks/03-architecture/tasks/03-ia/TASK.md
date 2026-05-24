---
id: 03-ia
title: Information Architecture
description: Define content hierarchy, naming, and structure
blocking: true
depends_on:
  - 01-sitemap
  - 02-journeys
inputs:
  - docs/product/SITEMAP.md
  - docs/product/USER_JOURNEYS.md
outputs:
  - docs/product/ARCHITECTURE.md
checks:
  - id: ia-exists
    cmd: test -f docs/product/ARCHITECTURE.md
skills:
  - information-architecture
---

# Information Architecture

Write ARCHITECTURE.md.