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
  - .converge/artifacts/app-builder/backlog.jsonl
checks:
  - id: backlog-exists
    cmd: test -f .converge/artifacts/app-builder/backlog.jsonl
  - id: no-self-modification
    cmd: "! git diff --name-only -- .converge/playbooks/app-builder/ | grep -q ."
---

# App Builder — Scrum Process

Backlog-driven development. The seed manages goals and tasks in backlog.jsonl.
Each epoch runs a plan → implement → verify sprint pipeline.
