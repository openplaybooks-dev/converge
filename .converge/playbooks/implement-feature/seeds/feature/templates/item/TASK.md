---
id: "{{taskId}}"
title: "Do: {{task}}"
mode: spawner
spawn:
  min_children: 1

---

# {{task}}

Emit four `converge spawn template` commands for:
- `001-analyze`
- `002-implement`
- `003-review`
- `004-quality`

Use the matching template paths under
`.converge/playbooks/implement-feature/seeds/feature/templates/item/tasks/`
and pass `task`, `projectDir`, `artifactsDir`, and each child `taskId`.
