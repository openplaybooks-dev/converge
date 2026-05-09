---
id: 06-deep-dive
title: "Phase 2 — Dynamic Deep Dive Research"
seeds:
  - type: nodejs
    path: ./seeds/spawn-deep-dive.seed.js
depends_on:
  - 01-company-site
  - 02-sec-edgar
  - 03-glassdoor
  - 04-news-search
  - 05-wayback
checks:
  - id: deep-dive-spawned
    cmd: node .converge/checks/check-deep-dive.js
    description: at least one deep-dive task spawned and produced output
---

# Phase 2: Dynamic Deep Dive Research

The seed script `spawn-deep-dive.seed.js` reads all 5 Phase 1 outputs and dynamically spawns subtasks:

- **Per executive** → `browser-background-check` — research career history, red flags
- **Per product line** → product market analysis and competitive comparison  
- **Per risk factor** (from 10-K) → deep-dive research on the risk
- **Per legal item** → `browser-legal-check` — court records, regulatory research
- **Per red flag** → cross-source corroboration

The seed determines what to spawn based on what Phase 1 discovered. Each spawned task uses agent-browser for additional research and produces structured JSON + screenshots.
