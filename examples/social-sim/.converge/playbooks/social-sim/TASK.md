---
id: social-sim
title: Social simulation — direct
seeds:
  - type: nodejs
    path: ./wbs/wbs.js
vars:
  scenario: misinfo
  populationSize: "10"
  steps: "3"
  recommender: hot-score
  seedPosts: "1"
  seed: "42"
  runId: ""
---

# Social Simulation — Direct

Each loop epoch is one simulation tick. The root WBS spawns one epoch task per
tick (capped by `steps`). Inside an epoch, three children run in order:

1. **`010-setup`** — ensure `runs/{runId}/personas.json` and
   `runs/{runId}/graph.json` exist (generate on epoch 1, no-op afterwards).
2. **`020-simulate`** — WBS over personas. For each persona, spawn one task
   that runs that persona for *this* tick: read state, decide one action,
   append to `runs/{runId}/timeline.jsonl`.
3. **`030-analyze`** — read this tick's new timeline rows, compute per-tick
   metrics, append to `runs/{runId}/metrics.jsonl`, update
   `reports/{scenario}.md`.

State files under `runs/{runId}/`:
- `personas.json` — cohort: `[{id, handle, bio, beliefs, ...}]`
- `graph.json` — follow edges: `{follows: {personaId: [personaId, ...]}}`
- `timeline.jsonl` — append-only action log: one JSON per line, fields
  `{tick, personaId, action, target?, text?, ts}`
- `metrics.jsonl` — per-tick rollups
- `seed-posts.json` — initial posts injected at tick 1 (for `misinfo` etc.)

Cross-tick visibility rule: a persona running in tick N reads only timeline
entries with `tick < N`. Reactions to a tick-N action happen in tick N+1.

Termination: the loop runner stops after `steps` epochs.
