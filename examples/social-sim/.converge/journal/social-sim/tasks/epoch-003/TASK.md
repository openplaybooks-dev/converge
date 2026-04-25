---
id: epoch-003
title: Tick 003
wbs:
  type: nodejs
  path: ./wbs/wbs.js
vars:
  tick: 003
  tickNum: 3
  runId: run-001
  scenario: misinfo
  populationSize: 10
  steps: 3
  recommender: hot-score
  seedPosts: 1
  seed: 42
  prevAnalyzeDep: epoch-002/030-analyze
  taskId: epoch-003
  epochTemplateDir: /Users/minh/Documents/converge/examples/social-sim/.converge/playbooks/social-sim/wbs/templates/epoch
---

# Tick 003

One simulation tick. Three children run in order:

1. **`010-setup`** — ensure `runs/run-001/personas.json` and
   `runs/run-001/graph.json` exist (idempotent; epoch 1 generates them).
2. **`020-simulate`** — WBS spawns `10` persona tasks. Each
   reads timeline entries from prior ticks, decides one action, appends to
   `runs/run-001/timeline.jsonl`.
3. **`030-analyze`** — read this tick's new rows, compute metrics, append
   to `runs/run-001/metrics.jsonl`, update `reports/misinfo.md`.

Scenario: **misinfo**. Population: 10. Recommender:
`hot-score`. Seed-posts: 1.
