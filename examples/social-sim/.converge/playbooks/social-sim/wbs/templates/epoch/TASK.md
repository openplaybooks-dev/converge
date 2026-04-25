---
id: "{{taskId}}"
title: "Tick {{tick}}"
wbs:
  type: nodejs
  path: ./wbs/wbs.js
vars:
  tick: "{{tick}}"
  tickNum: "{{tickNum}}"
  runId: "{{runId}}"
  scenario: "{{scenario}}"
  populationSize: "{{populationSize}}"
  steps: "{{steps}}"
  recommender: "{{recommender}}"
  seedPosts: "{{seedPosts}}"
  seed: "{{seed}}"
  prevAnalyzeDep: "{{prevAnalyzeDep}}"
---

# Tick {{tick}}

One simulation tick. Three children run in order:

1. **`010-setup`** — ensure `runs/{{runId}}/personas.json` and
   `runs/{{runId}}/graph.json` exist (idempotent; epoch 1 generates them).
2. **`020-simulate`** — WBS spawns `{{populationSize}}` persona tasks. Each
   reads timeline entries from prior ticks, decides one action, appends to
   `runs/{{runId}}/timeline.jsonl`.
3. **`030-analyze`** — read this tick's new rows, compute metrics, append
   to `runs/{{runId}}/metrics.jsonl`, update `reports/{{scenario}}.md`.

Scenario: **{{scenario}}**. Population: {{populationSize}}. Recommender:
`{{recommender}}`. Seed-posts: {{seedPosts}}.
