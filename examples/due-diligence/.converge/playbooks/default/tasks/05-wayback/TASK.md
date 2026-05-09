---
id: 05-wayback
title: "Phase 1 — Check Wayback Machine"
skill: browser-check-wayback
outputs:
  - .converge/artifacts/due-diligence/wayback/history-data.json
  - .converge/artifacts/due-diligence/wayback/screenshots/
vars:
  artifactsRoot: .converge/artifacts/due-diligence/wayback
checks:
  - id: history-data-exists
    cmd: test -f .converge/artifacts/due-diligence/wayback/history-data.json
    description: history-data.json written
  - id: history-data-valid
    cmd: node .converge/checks/check-history-data.js
    description: history-data.json has archive overview and historical snapshots
---

# Phase 1: Check Wayback Machine

Use agent-browser to research **{{website}}** history via the Internet Archive's Wayback Machine.

## Objective

Analyze the company website's history. Track how positioning, products, and messaging changed over time. Identify when key pages first appeared. Capture screenshots of historical snapshots.

The skill `browser-check-wayback` has the full procedure. Key outputs:

- `history-data.json` — historical website data with milestones
- `screenshots/` — screenshots of key historical snapshots

## Quality Bar

- At least 3 historical snapshots analyzed (1 year ago, 2 years ago, first available)
- Key page first-appearance dates tracked
- At least 2 website milestones identified
