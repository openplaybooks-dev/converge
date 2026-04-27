---
id: 001-core-studio-api-export
title: Add @converge/core/studio-api re-export module
outputs:
  - packages/core/src/studio-api.ts
  - packages/core/package.json
checks:
  - id: studio-api-file-exists
    description: studio-api.ts module exists
    cmd: "test -f packages/core/src/studio-api.ts"
  - id: exports-entry
    description: package.json exports map has ./studio-api entry
    cmd: "node -e \"const e=require('./packages/core/package.json').exports;process.exit(e['./studio-api']?0:1)\""
  - id: import-resolves
    description: Import resolves and exposes SimpleLogTailer + loadPlaybook
    cmd: "cd packages/core && pnpm build 2>&1 | tail -3 && node --input-type=module -e \"import('@converge/core/studio-api').then(m=>{if(!m.SimpleLogTailer||!m.loadPlaybook)process.exit(1)}).catch(e=>{console.error(e);process.exit(1)})\""
---

Create a re-export module that surfaces every symbol the studio needs from `@converge/core`. This is required because `@converge/core/package.json` uses an explicit `exports` map (no `./*` glob), so the studio cannot import internal subpaths directly.

**File: `packages/core/src/studio-api.ts`**

Re-export from these existing modules (verify each path before re-exporting; if a symbol moved, find it):

```ts
// Playbook discovery and loading
export {
  discoverPlaybooks,
  loadPlaybook,
  validatePlaybook,
  parseDuration,
} from './task/playbook/loader.js';

// Storage / config schemas
export {
  PlaybookConfigSchema,
  ProjectConfigSchema,
  TaskStatusSchema,
  CheckpointSchema,
} from './storage/types.js';

// Journal types and reader
export type { JournalEvent, EventType, TaskStatus } from './journal/types.js';
export { readEvents, readTaskStatus } from './journal/reader.js';
export { SimpleLogTailer } from './journal/simple-log-tailer.js';

// Task definition shape (for editor validation)
export type { TaskDefinition } from './config/task-definition.js';
```

**Update `packages/core/package.json`**: add a new entry to the `exports` map:

```jsonc
{
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./studio-api": {
      "import": "./dist/studio-api.js",
      "types": "./dist/studio-api.d.ts"
    },
    /* ... existing entries ... */
  }
}
```

Make sure the build pipeline (likely `tsup` — check `packages/core/tsup.config.ts` or `package.json#scripts.build`) includes `studio-api` as an entry. If `tsup` is configured with `entries: ['src/index.ts', 'src/planner.ts', ...]`, append `'src/studio-api.ts'`.

**Process**:
1. Read existing modules to confirm exact symbol names and paths (some may have moved during prior refactors).
2. Write `studio-api.ts`.
3. Update `package.json` `exports`.
4. Update `tsup.config.ts` (or equivalent build config) to include the new entry.
5. Run `pnpm --filter @converge/core build`.
6. Verify import works.
