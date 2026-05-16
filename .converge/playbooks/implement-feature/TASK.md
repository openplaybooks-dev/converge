---
id: do
title: Task dispatcher
seed:
  mode: cli
---

# Task Dispatcher

Each `--add` should emit one `converge spawn template` command that
instantiates `.converge/playbooks/implement-feature/seeds/feature/templates/item/TASK.md`.

Rules:
- Determine the next numeric prefix from sibling `tasks/` directories that match `^\d+-`.
- Build a deterministic slug from the requested task text.
- Use `<prefix>-<slug>` as the spawned task id.
- Pass `taskId`, `task`, `projectDir`, and `.converge/artifacts/do/<taskId>` as template vars.
- Emit only `converge spawn ...` commands.
