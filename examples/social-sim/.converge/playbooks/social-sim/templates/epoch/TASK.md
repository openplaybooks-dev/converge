---
id: "{{taskId}}"
title: "Tick {{tick}}"
vars:
  epoch:
  tick:
  tickNum:
  runId:
  scenario:
  populationSize:
  steps:
  recommender:
  seedPosts:
  seed:
---

# Tick {{tick}}

One simulation tick. Three children run in order via the `tasks/`
subdirectory convention and their `depends_on:` chain:

1. **`010-setup`** — ensure `runs/{{runId}}/personas.json` and
   `runs/{{runId}}/graph.json` exist (idempotent; tick 1 generates them).
2. **`020-simulate`** — spawn `{{populationSize}}` persona tasks. Each
   reads timeline entries from prior ticks, decides one action, appends to
   `runs/{{runId}}/timeline.jsonl`.
3. **`030-analyze`** — read this tick's new rows, compute metrics, append
   to `runs/{{runId}}/metrics.jsonl`, update `vault/reports/{{scenario}}.md`.

Scenario: **{{scenario}}**. Population: {{populationSize}}. Recommender:
`{{recommender}}`. Seed-posts: {{seedPosts}}.

Each phase inherits this epoch's vars (`epoch`, `tick`, `tickNum`, `runId`,
`scenario`, `populationSize`, `steps`, `recommender`, `seedPosts`, `seed`)
via the framework's strict-mode var inheritance — nothing for this task
itself to run; the phase subtasks carry the work.
