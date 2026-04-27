---
id: 024-no-mc-api-routes
title: API surface is exactly the converge-native subset
dependencies:
  - 019-purge-mc-surface
checks:
  - id: api-allowlist-only
    description: src/app/api/ contains only converge-native top-level dirs
    cmd: "bash -c 'cd packages/converge-studio/src/app/api && allowed=\"playbooks runs run watch events\"; for d in */; do d=${d%/}; case \" $allowed \" in *\" $d \"*) ;; *) echo \"unexpected: $d\"; exit 1 ;; esac; done'"
  - id: api-required-present
    description: All required converge-native API dirs are present
    cmd: "test -d packages/converge-studio/src/app/api/playbooks && test -d packages/converge-studio/src/app/api/runs && test -d packages/converge-studio/src/app/api/run && test -d packages/converge-studio/src/app/api/watch && test -d packages/converge-studio/src/app/api/events"
  - id: nodejs-runtime-on-all-routes
    description: Every route.ts under src/app/api/ declares runtime = 'nodejs'
    cmd: "bash -c 'count=$(find packages/converge-studio/src/app/api -name route.ts | wc -l | tr -d \" \"); ok=$(grep -l \"runtime = .nodejs.\" $(find packages/converge-studio/src/app/api -name route.ts) 2>/dev/null | wc -l | tr -d \" \"); test \"$count\" = \"$ok\"'"
---

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
