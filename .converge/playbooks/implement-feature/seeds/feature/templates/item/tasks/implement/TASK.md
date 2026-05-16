---
id: "{{taskId}}"
title: "Implement — {{task}}"
seed:
  mode: cli
---

# Implement

Emit three `converge spawn template` commands for:
- `001-plan`
- `002-todos`
- `003-verify`

Use the matching template paths under
`.converge/playbooks/implement-feature/seeds/feature/templates/item/tasks/implement/tasks/`
and pass `task`, `projectDir`, `artifactsDir`, and each child `taskId`.
