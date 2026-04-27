---
id: 003-playbooks-rw
title: Playbook list/read/write/create with atomic writes
dependencies:
  - 002-paths-and-root
outputs:
  - packages/converge-studio/src/lib/converge-adapter/playbooks.ts
checks:
  - id: playbooks-module-exists
    description: playbooks.ts exists
    cmd: "test -f packages/converge-studio/src/lib/converge-adapter/playbooks.ts"
  - id: typecheck
    description: Module typechecks
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: list-real-playbooks
    description: listPlaybooks returns at least one of the real playbooks in this repo
    cmd: "cd packages/converge-studio && CONVERGE_PROJECT_ROOT=/Users/minh/Documents/converge tsx -e \"import('./src/lib/converge-adapter/playbooks.ts').then(async m=>{const ps=await m.listPlaybooks();process.exit(ps.find(p=>p.name==='oss-standardize')?0:1)}).catch(e=>{console.error(e);process.exit(1)})\""
---

Implement `packages/converge-studio/src/lib/converge-adapter/playbooks.ts` exposing functions to list, read, write, and create playbooks. Atomic writes (temp + rename) so the chokidar watcher never sees half-written files.

**API**:

```ts
import { discoverPlaybooks, loadPlaybook, validatePlaybook, PlaybookConfigSchema }
  from '@converge/core/studio-api';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import YAML from 'yaml';
import { playbooksDir, playbookManifestPath, playbookDir } from './paths.js';

export interface PlaybookSummary {
  name: string;
  description?: string;
  mode?: string;
  taskCount: number;
  lastSessionAt?: string;  // ISO from latest journal session, if any
}

export interface NewPlaybookSpec {
  name: string;
  description?: string;
  inputs?: Record<string, { description?: string; required?: boolean }>;
  run?: {
    mode?: 'oneoff' | 'dispatch' | 'converge' | 'loop';
    maxTaskAttempts?: number;
    maxDuration?: string;
    resume?: boolean;
    stall?: { maxConsecutive?: number; backoffMs?: number };
  };
  checks?: Array<{ id: string; cmd: string; description?: string }>;
}

export async function listPlaybooks(root?: string): Promise<PlaybookSummary[]>;
export async function readPlaybook(name: string, root?: string):
  Promise<{ raw: string; parsed: ReturnType<typeof loadPlaybook> }>;
export async function writePlaybook(name: string, yamlText: string, root?: string): Promise<void>;
export async function createPlaybook(spec: NewPlaybookSpec, root?: string): Promise<void>;
```

**Implementation notes**:

- `listPlaybooks` — call `discoverPlaybooks()` from core; for each, count tasks under `tasks/` and find the latest session under `.converge/journal/<name>/sessions/`.
- `readPlaybook` — read `playbook.yml` raw, then call `loadPlaybook` for the parsed form.
- `writePlaybook` — parse YAML, validate via `validatePlaybook`/`PlaybookConfigSchema`, then atomic write: `fs.writeFile(target+'.tmp', text)` → `fs.rename(target+'.tmp', target)`.
- `createPlaybook` — validate name is a safe slug (`/^[a-z0-9][a-z0-9-]*$/`), check the dir doesn't already exist, build the YAML from `spec` using the `yaml` package, create `playbookDir/name`, write `playbook.yml` atomically, create empty `tasks/` directory.

**Reuse**: `discoverPlaybooks`, `loadPlaybook`, `validatePlaybook`, `PlaybookConfigSchema` from `@converge/core/studio-api`. Do not duplicate YAML parsing for validation.

**Manual smoke test**: import the module from a small script with `CONVERGE_PROJECT_ROOT=/Users/minh/Documents/converge` and confirm `listPlaybooks()` returns the existing playbooks (`oss-standardize`, `split-cli-monolith`, etc).
