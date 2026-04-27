---
title: Phase 02 — Filesystem data layer (ConvergeAdapter)
blocking: true
---

Build the `ConvergeAdapter` — the bridge between Mission Control's UI shell and converge's filesystem (`.converge/playbooks/`, `.converge/journal/`). Filesystem is canonical; no SQLite or Prisma.

Six leaf tasks:

1. **001-core-studio-api-export** — extend `@converge/core`'s `exports` map with `./studio-api` re-exporting the symbols the studio needs.
2. **002-paths-and-root** — project-root resolution and `.converge/*` path helpers.
3. **003-playbooks-rw** — list/read/write/create playbooks with atomic writes.
4. **004-tasks-rw** — task markdown read/write (frontmatter + body) plus checkpoint read and reset.
5. **005-sessions-and-tail** — session listing, event reads, async-iterable tail using core's `SimpleLogTailer`.
6. **006-watcher** — chokidar-based file watcher, coalesced, emits typed `FsChangeEvent`.

All adapter code lives at `packages/converge-studio/src/lib/converge-adapter/`.
