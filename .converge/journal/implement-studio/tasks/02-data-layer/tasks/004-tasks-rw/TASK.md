---
id: 004-tasks-rw
title: Task markdown read/write + checkpoint read/reset
dependencies:
  - 002-paths-and-root
outputs:
  - packages/converge-studio/src/lib/converge-adapter/tasks.ts
  - packages/converge-studio/src/lib/converge-adapter/frontmatter.ts
checks:
  - id: tasks-module-exists
    description: tasks.ts and frontmatter.ts exist
    cmd: "test -f packages/converge-studio/src/lib/converge-adapter/tasks.ts && test -f packages/converge-studio/src/lib/converge-adapter/frontmatter.ts"
  - id: typecheck
    description: Modules typecheck
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: read-real-task
    description: readTaskMd returns frontmatter for a known task
    cmd: "cd packages/converge-studio && CONVERGE_PROJECT_ROOT=/Users/minh/Documents/converge tsx -e \"import('./src/lib/converge-adapter/tasks.ts').then(async m=>{const t=await m.readTaskMd('oss-standardize','01-brand');process.exit(t.frontmatter.title==='Brand Consolidation'?0:1)}).catch(e=>{console.error(e);process.exit(1)})\""
---

Implement task markdown read/write plus checkpoint operations.

**`frontmatter.ts`** — thin wrapper over `gray-matter`:

```ts
import matter from 'gray-matter';

export function parseFrontmatter(text: string): { data: Record<string, unknown>; content: string };
export function serializeFrontmatter(data: Record<string, unknown>, content: string): string;
```

**`tasks.ts`** — task discovery and editing:

```ts
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { playbookTasksDir, tasksJournalDir } from './paths.js';
import { parseFrontmatter, serializeFrontmatter } from './frontmatter.js';

export interface TaskSummary {
  taskPath: string;          // relative to playbook tasks/, e.g. "01-brand" or "01-brand/tasks/001-source-rename"
  title?: string;
  hasChildren: boolean;      // true if it has a tasks/ subdir
  blocking?: boolean;
}

export interface Checkpoint { /* shape matches @converge/core CheckpointSchema */ }

export async function listTasks(playbook: string, root?: string): Promise<TaskSummary[]>;
export async function readTaskMd(playbook: string, taskPath: string, root?: string):
  Promise<{ frontmatter: Record<string, unknown>; body: string }>;
export async function writeTaskMd(playbook: string, taskPath: string,
  frontmatter: Record<string, unknown>, body: string, root?: string): Promise<void>;
export async function readCheckpoint(playbook: string, taskPath: string, root?: string): Promise<Checkpoint | null>;
export async function resetTask(playbook: string, taskPath: string, root?: string): Promise<void>;
```

**Implementation notes**:

- `listTasks` — recursive walk of `<playbook>/tasks/`. Each directory containing a `TASK.md` is a task. Track whether it has a `tasks/` subdirectory (`hasChildren`).
- `readTaskMd` — read `<playbook>/tasks/<taskPath>/TASK.md`, return `{ frontmatter, body }`.
- `writeTaskMd` — atomic write of `<playbook>/tasks/<taskPath>/TASK.md` using `serializeFrontmatter`. **Document the lossy round-trip**: `gray-matter`'s YAML serializer reformats keys; comments and exact quoting are not preserved. Add a comment at the top of `frontmatter.ts` calling this out.
- `readCheckpoint` — read `<journal>/<playbook>/tasks/<taskPath>/checkpoint.json`, JSON.parse, return null if missing.
- `resetTask` — delete `<journal>/<playbook>/tasks/<taskPath>/checkpoint.json` (and any sibling state files like `attempts/` if present). Match what `packages/cli/src/commands-reset.ts` does — read that file before implementing to keep semantics consistent.

**Reuse**: `CheckpointSchema` from `@converge/core/studio-api` for type-only import.

**Manual smoke test**: with `CONVERGE_PROJECT_ROOT=/Users/minh/Documents/converge`, `readTaskMd('oss-standardize', '01-brand')` should return `frontmatter.title === 'Brand Consolidation'`.
