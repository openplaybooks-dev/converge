---
id: 002-paths-and-root
title: Project-root resolution and .converge/* path helpers
dependencies:
  - 001-core-studio-api-export
outputs:
  - packages/converge-studio/src/lib/converge-adapter/paths.ts
checks:
  - id: paths-module-exists
    description: paths.ts exists
    cmd: "test -f packages/converge-studio/src/lib/converge-adapter/paths.ts"
  - id: typecheck
    description: Module typechecks
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
---

Create `packages/converge-studio/src/lib/converge-adapter/paths.ts` exporting helpers that resolve the converge project root and the standard `.converge/*` subpaths.

**Module shape**:

```ts
import { findConvergeRoot } from '@converge/project-root';
import path from 'node:path';

export function resolveProjectRoot(): string {
  // Priority: explicit env var > findConvergeRoot from cwd
  const explicit = process.env.CONVERGE_PROJECT_ROOT;
  if (explicit) return path.resolve(explicit);
  const found = findConvergeRoot(process.cwd());
  if (!found) {
    throw new Error(
      'No .converge/ directory found. Set CONVERGE_PROJECT_ROOT or run from inside a converge project.'
    );
  }
  return found;
}

export function convergeDir(root = resolveProjectRoot()): string {
  return path.join(root, '.converge');
}

export function playbooksDir(root?: string): string {
  return path.join(convergeDir(root), 'playbooks');
}

export function playbookDir(name: string, root?: string): string {
  return path.join(playbooksDir(root), name);
}

export function playbookManifestPath(name: string, root?: string): string {
  return path.join(playbookDir(name, root), 'playbook.yml');
}

export function playbookTasksDir(name: string, root?: string): string {
  return path.join(playbookDir(name, root), 'tasks');
}

export function journalDir(root?: string): string {
  return path.join(convergeDir(root), 'journal');
}

export function playbookJournalDir(playbook: string, root?: string): string {
  return path.join(journalDir(root), playbook);
}

export function sessionsDir(playbook: string, root?: string): string {
  return path.join(playbookJournalDir(playbook, root), 'sessions');
}

export function sessionDir(playbook: string, sessionId: string, root?: string): string {
  return path.join(sessionsDir(playbook, root), sessionId);
}

export function tasksJournalDir(playbook: string, root?: string): string {
  return path.join(playbookJournalDir(playbook, root), 'tasks');
}
```

**Reuse**: `findConvergeRoot` from `@converge/project-root`. Verify the import path by reading `packages/project-root/src/index.ts` first — adjust the import if the export name differs.
