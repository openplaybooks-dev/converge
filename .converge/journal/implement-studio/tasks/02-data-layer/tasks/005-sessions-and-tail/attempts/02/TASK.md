# Task: 02-data-layer/005-sessions-and-tail

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