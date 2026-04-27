---
title: Phase 05 — Run supervisor (spawn converge run, stream stdout)
blocking: true
---

Make the "Run" button work: spawn `converge run <playbook>` as a child process from a Node-runtime Next.js handler, stream stdout/stderr to the browser via SSE, and correlate the spawned run to its journal session directory.

Three leaf tasks:

1. **001-supervisor-module** — `src/lib/run-supervisor.ts` with `RunHandle` shape, ring buffers, EventEmitter, concurrency cap.
2. **002-run-api-route** — `POST /api/run` (spawn) and `GET /api/run/[runId]/stream` (SSE with `Last-Event-ID` resume).
3. **003-session-correlation** — watch `.converge/journal/{playbook}/sessions/` for new dirs created after spawn time; first new dir wins, attached to the `RunHandle` as `sessionId`.
