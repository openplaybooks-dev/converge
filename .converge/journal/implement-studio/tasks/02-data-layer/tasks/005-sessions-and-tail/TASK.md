---
id: 005-sessions-and-tail
title: Session listing, event reads, and live tail
dependencies:
  - 002-paths-and-root
outputs:
  - packages/converge-studio/src/lib/converge-adapter/sessions.ts
checks:
  - id: sessions-module-exists
    description: sessions.ts exists
    cmd: "test -f packages/converge-studio/src/lib/converge-adapter/sessions.ts"
  - id: typecheck
    description: Module typechecks
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: list-real-sessions
    description: listSessions returns sessions for an existing journal
    cmd: "cd packages/converge-studio && CONVERGE_PROJECT_ROOT=/Users/minh/Documents/converge tsx -e \"import('./src/lib/converge-adapter/sessions.ts').then(async m=>{const s=await m.listSessions('oss-standardize');process.exit(s.length>0?0:1)}).catch(e=>{console.error(e);process.exit(1)})\""
---

Implement session-level reads and a live-tail iterator over `events.jsonl`.

**API**:

```ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { sessionsDir, sessionDir } from './paths.js';
import { readEvents, SimpleLogTailer, type JournalEvent } from '@converge/core/studio-api';

export interface SessionSummary {
  playbook: string;
  sessionId: string;
  startTime: string;
  endTime?: string;
  status?: 'running' | 'completed' | 'failed';
  iterations?: number;
}

export interface SessionMetadata { /* matches whatever metadata.json contains */ }

export async function listSessions(playbook: string, root?: string): Promise<SessionSummary[]>;
export async function readMetadata(playbook: string, sessionId: string, root?: string): Promise<SessionMetadata>;
export async function readEventsPaginated(playbook: string, sessionId: string,
  opts: { offset?: number; limit?: number }, root?: string): Promise<JournalEvent[]>;
export function tailEvents(playbook: string, sessionId: string, root?: string): AsyncIterable<JournalEvent>;
```

**Implementation notes**:

- `listSessions` — `readdir(sessionsDir(playbook))`; for each subdir, read `metadata.json` for start/end/status. Sort newest first. If `metadata.json` is missing/malformed, infer from directory mtime and mark status `unknown`.
- `readMetadata` — JSON parse `<sessionDir>/metadata.json`. Throw if missing.
- `readEventsPaginated` — delegate to `readEvents` from core with `{ offset, limit }`.
- `tailEvents` — async generator wrapping `SimpleLogTailer` from core. The tailer already handles file-position tracking and chokidar watching for `events.jsonl`. Yield each new event as it arrives. On consumer abort (e.g. SSE disconnect), close the tailer.

**Reuse**: `readEvents`, `SimpleLogTailer`, `JournalEvent` from `@converge/core/studio-api`. Do not reimplement file tailing or position tracking.

**Smoke test**: against this repo's `.converge/journal/oss-standardize/sessions/`, `listSessions('oss-standardize')` must return at least one session.
