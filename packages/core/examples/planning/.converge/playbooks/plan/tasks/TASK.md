---
title: Plan — ${prompt}
wbs:
  type: nodejs
  path: ./wbs/wbs.js
blocking: true
skills:
  - converge-planning
---

Root task for generating a converge playbook.

Takes the user's prompt and auto-scanned project state, then runs
a 5-phase pipeline: scan → research → decompose → validate → emit.

Output: a runnable playbook at `.converge/playbooks/${name}/`.
