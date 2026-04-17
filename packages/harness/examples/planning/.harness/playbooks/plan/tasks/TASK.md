---
title: Plan — ${prompt}
wbs:
  type: nodejs
  path: ./wbs/wbs.js
blocking: true
skills:
  - harness-planning
---

Root task for generating a harness playbook.

Takes the user's prompt and auto-scanned project state, then runs
a 5-phase pipeline: scan → research → decompose → validate → emit.

Output: a runnable playbook at `.harness/playbooks/${name}/`.
