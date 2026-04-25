---
id: epoch-001
title: Tick 001
wbs:
  type: nodejs
  path: ./wbs/wbs.js
vars:
  tick: 001
  tickNum: 1
  runId: run-2026-04-25T01-45
  scenario: misinfo
  populationSize: 10
  steps: 3
  recommender: hot-score
  seedPosts: 1
  seed: 42
  prevAnalyzeDep: 
  taskId: epoch-001
  epochTemplateDir: /Users/minh/Documents/converge/examples/social-sim/.converge/playbooks/social-sim/wbs/templates/epoch
---

# Tick 001

One simulation tick. Three children run in order:

1. **`010-setup`** — ensure `runs/run-2026-04-25T01-45/personas.json` and
   `runs/run-2026-04-25T01-45/graph.json` exist (idempotent; epoch 1 generates them).
2. **`020-simulate`** — WBS spawns `10` persona tasks. Each
   reads timeline entries from prior ticks, decides one action, appends to
   `runs/run-2026-04-25T01-45/timeline.jsonl`.
3. **`030-analyze`** — read this tick's new rows, compute metrics, append
   to `runs/run-2026-04-25T01-45/metrics.jsonl`, update `reports/misinfo.md`.

Scenario: **misinfo**. Population: 10. Recommender:
`hot-score`. Seed-posts: 1.
