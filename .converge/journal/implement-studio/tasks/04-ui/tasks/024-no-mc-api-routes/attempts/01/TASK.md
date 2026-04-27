# Task: 04-ui/024-no-mc-api-routes

Codify the API allowlist: `src/app/api/` may contain ONLY these top-level directories:

- `playbooks/` — list, create, read, update playbooks
- `runs/` — list sessions, read metadata, paginated events, SSE event tail
- `run/` — POST to spawn a run, SSE for stdout/stderr
- `watch/` — SSE filesystem-change stream
- `events/` — converge-native event source for `LiveActivity` (added in task 009)

Anything else is a Mission Control leftover.

This task is check-only — the work was done in 019. The task exists as an explicit, easy-to-read gate that a future regression will trip immediately.

**If the allowlist check fails on first run:** 019 missed something. List the offenders:
```bash
ls packages/converge-studio/src/app/api/
```
Delete each one not in the allowlist.

**Why also enforce the runtime check:** several routes import `chokidar` or `fs` (the watcher, the SSE tail). Without `export const runtime = 'nodejs'`, Next.js will try to compile them for the Edge runtime and fail at request time, not build time. This check catches that proactively.