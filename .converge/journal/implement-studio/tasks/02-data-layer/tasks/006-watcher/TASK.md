---
id: 006-watcher
title: Coalesced filesystem watcher
dependencies:
  - 002-paths-and-root
outputs:
  - packages/converge-studio/src/lib/converge-adapter/watcher.ts
  - packages/converge-studio/src/lib/converge-adapter/index.ts
checks:
  - id: watcher-module-exists
    description: watcher.ts and index.ts exist
    cmd: "test -f packages/converge-studio/src/lib/converge-adapter/watcher.ts && test -f packages/converge-studio/src/lib/converge-adapter/index.ts"
  - id: typecheck
    description: Modules typecheck
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: adapter-public-api
    description: index.ts re-exports the full adapter surface
    cmd: "grep -q 'listPlaybooks\\|listTasks\\|listSessions\\|watch' packages/converge-studio/src/lib/converge-adapter/index.ts"
---

Implement a chokidar-based watcher that emits coalesced, typed change events for the SSE/WS layer to forward to the browser.

**Constraints**:
- Append-only `events.jsonl` files do **NOT** go through chokidar — they're handled by `SimpleLogTailer` per session in `sessions.ts`. Watch only directory metadata + non-jsonl files.
- Use `awaitWriteFinish: { stabilityThreshold: 50 }` so we don't see half-written files.
- Coalesce events on a 100ms per-path debounce.

**API (`watcher.ts`)**:

```ts
import chokidar from 'chokidar';
import { EventEmitter } from 'node:events';
import * as path from 'node:path';
import { convergeDir, playbooksDir, journalDir } from './paths.js';

export type FsChangeKind =
  | 'playbook-added' | 'playbook-changed' | 'playbook-removed'
  | 'task-added'     | 'task-changed'     | 'task-removed'
  | 'session-added'  | 'session-changed';

export interface FsChangeEvent {
  kind: FsChangeKind;
  playbook?: string;
  taskPath?: string;
  sessionId?: string;
  filePath: string;
  at: string;  // ISO
}

export class ConvergeWatcher extends EventEmitter {
  constructor(root: string);
  start(): void;
  stop(): Promise<void>;
}
```

**Implementation notes**:

- Watch globs (relative to `convergeDir(root)`):
  - `playbooks/*/playbook.yml`
  - `playbooks/*/tasks/**/TASK.md`
  - `journal/*/sessions/*/metadata.json`
  - `journal/*/tasks/**/checkpoint.json`
  - **Ignore**: `journal/*/sessions/*/events.jsonl` (tailer handles it), `node_modules`, dotfiles other than `.converge`.
- For each chokidar event (`add`/`change`/`unlink`), classify by path pattern → `FsChangeKind` and extract `playbook`/`taskPath`/`sessionId`.
- Coalesce per-path: keep a `Map<filePath, NodeJS.Timeout>`; on each event, clear and reset a 100ms timer that emits the final classified event.

**Public surface (`index.ts`)** — single entry point for the studio:

```ts
export * from './paths.js';
export * from './playbooks.js';
export * from './tasks.js';
export * from './sessions.js';
export * from './watcher.js';
export * from './frontmatter.js';
```

This is the public surface API routes will import from in Phase 03.
