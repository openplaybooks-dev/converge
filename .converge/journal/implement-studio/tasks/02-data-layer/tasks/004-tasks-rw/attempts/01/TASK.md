# Task: 02-data-layer/004-tasks-rw

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