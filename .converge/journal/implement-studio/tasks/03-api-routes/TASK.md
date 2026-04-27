---
title: Phase 03 — Next.js API routes wired to ConvergeAdapter
blocking: true
---

Replace Mission Control's API surface with route handlers that use `ConvergeAdapter`. Every route must declare `export const runtime = 'nodejs'` (chokidar/fs are not Edge-compatible).

Five leaf tasks:

1. **001-playbooks-routes** — `/api/playbooks` (GET/POST), `/api/playbooks/[name]` (GET/PUT).
2. **002-tasks-routes** — `/api/playbooks/[name]/tasks/...` (GET/PUT) plus `/reset` (POST).
3. **003-runs-routes** — `/api/runs`, `/api/runs/[id]`, `/api/runs/[id]/events`, `/api/runs/[id]/stream` (SSE).
4. **004-watch-sse** — `/api/watch` SSE stream of coalesced filesystem change events.
5. **005-delete-removed-routes** — delete obsolete routes (`/api/agents/**`, `/api/auth/**`, framework-adapter routes).
