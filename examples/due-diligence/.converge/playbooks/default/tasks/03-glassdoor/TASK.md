---
id: 03-glassdoor
title: "Phase 1 — Extract Glassdoor Data"
skill: browser-extract-glassdoor
outputs:
  - .converge/artifacts/due-diligence/glassdoor/people-data.json
  - .converge/artifacts/due-diligence/glassdoor/screenshots/
vars:
  artifactsRoot: .converge/artifacts/due-diligence/glassdoor
checks:
  - id: people-data-exists
    cmd: test -f .converge/artifacts/due-diligence/glassdoor/people-data.json
    description: people-data.json written
  - id: people-data-valid
    cmd: node .converge/checks/check-people-data.js
    description: people-data.json has ratings and review data
---

# Phase 1: Extract Glassdoor Data

Use agent-browser to extract company overview data from Glassdoor for **{{company}}**.

## Objective

Navigate Glassdoor's public pages (no login). Extract: company overview, employee ratings, salary ranges, and review trends. Capture screenshots as evidence.

The skill `browser-extract-glassdoor` has the full procedure. Key outputs:

- `people-data.json` — structured employee/company sentiment data
- `screenshots/` — evidence screenshots

## Handling Glassdoor Walls

Glassdoor may show sign-in prompts or limit content. Extract whatever is visible without login. If salary data is behind a wall, skip it. The task should succeed with whatever partial data is available.
