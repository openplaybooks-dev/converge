---
id: build
title: Scrum-based app builder
description: >-
  Scrum development process. Backlog (goals + tasks) in backlog.jsonl.
  Each epoch = one sprint with plan → implement → verify pipeline.
  Backlog evolves reactively — new tasks discovered during sprints.
  Stops when all goals are done.
materialization: incremental
seeds:
  - type: seed
    name: epoch
inputs:
  - idea.md
outputs:
  - .converge/artifacts/goal-driven-dev/goals.jsonl
  - .converge/artifacts/goal-driven-dev/tasks.jsonl
checks:
  - id: tasks-exist
    cmd: test -f .converge/artifacts/goal-driven-dev/tasks.jsonl
  - id: no-self-modification
    cmd: "! git diff --name-only -- .converge/playbooks/goal-driven-dev/ | grep -q ."
---

# App Builder — Scrum Process

Backlog-driven development. The seed manages goals and tasks in backlog.jsonl.
Each epoch runs a plan → implement → verify sprint pipeline.
