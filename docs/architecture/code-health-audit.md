# Code Health Audit: `@converge/core` & `@converge/cli`

**Date:** 2026-05-09 · **Scope:** `packages/core` (310 files, 75K lines) + `packages/cli` (28 files, 9.8K lines)

---

## Architecture Overview

Converge has two phases that `converge run` executes together:

```
converge run
────────────
1. COMPILE (auto)
   playbook.yml + TASK.md files
        │
        ▼
   buildDagFromPlaybook()
   discoverStaticChildren()
   splitContainerNodes()
   injectRootNodes()
   hash every node
        │
        ▼
   write manifest.json
   write runstate.json
        │
        ▼
   .converge/target/{playbook}/
   ├── manifest.json
   └── runstate.json

2. EXECUTE
   manifest.json (from target)
        │
        ▼
   buildDagFromManifest()
   RunStateManager ← runstate.json
        │
        ▼
   TaskDag execution
   (topological walk)
        │
        ▼
   runDag() → execute → update
        │
        ▼
   .converge/target/{playbook}/
   ├── runstate.json (updated)
   ├── events.jsonl
   └── tasks/{taskId}/
       ├── status.json
       └── gaps.yml
```

**Compile** (phase 1) scans the playbook filesystem, builds a deterministic DAG, fingerprints every node, and writes `manifest.json` + `runstate.json` to the journal. Idempotent — re-running produces the same hashes. `converge compile` can also be run standalone to preview the DAG without executing.

**Run** (phase 2) reads `manifest.json` from the journal, reconstructs the `TaskDag`, walks it topologically, and executes each node. After execution, it updates `runstate.json`, appends `events.jsonl`, and writes per-task forensics.

---

## Phase 1+2 Fixes Applied

| Fix | Detail |
|-----|--------|
| Dead files deleted | 9 CLI files (~2,900 lines) + 21 core files (~4,500 lines) |
| Dead functions removed | `commands-run.ts`: 500→145 lines, `commands.ts`: 889→620 lines, `next-task.ts`: 1,794→1,669 lines, `reconcile.ts`: 207→40 lines |
| Dead exports removed | `pluginsCommand`, `reconcile()`, `getCompletedTaskIds()`, `findNextTask()` |
| Broken imports fixed | `main.ts` had 2 dynamic imports pointing to nonexistent files |
| `require()` → `import` | All 3 dynamic `require()` calls eliminated |
| Deduplicated utilities | `formatDuration`, `buildManifestFromTree` |
| Barrel exports added | `TaskStateManager`, `getJournalStructure`, `getEpicsDir`, hash functions |

**Net reduction:** CLI 13,559 → 9,842 lines (27%).

---

## Remaining Architectural Issues

### 1. Dual execution pipeline in `run.ts` ⚠️ HIGH

`core/src/run.ts` uses both `executeTask` (old, `task/lifecycle/task-runner.ts`, 1,401 lines) and `Unit` (new V2, `task/unit/unit.ts`).

### 2. `TaskTree` deprecated but still in use ⚠️ HIGH

`dag/dag-tree.ts` (1,401 lines) is marked `@deprecated` but imported by 4 CLI files + 1 core file.

### 3. Forked navigator ⚠️ HIGH

`@converge/navigator` declared but never imported. Core uses its own fork at `navigator/core/`. The standalone package has zero consumers.

### 4. 94% deep-path imports 📋 MEDIUM

68 of 72 CLI→core imports bypass the barrel, coupling CLI to core's internal file structure.

### 5. 138 `as any` casts 📋 MEDIUM

Concentrated in `run.ts` (16), `task-runner.ts` (12), `seed-executor.ts` (12), `session-event-bridge.ts` (11), `declarative-loader.ts` (9).

### 6. Import extension chaos 📋 MEDIUM

19 files mix `.js` and `.ts` import extensions with no consistent convention.

### 7. `dag/` → `config/` layering violation 📋 MEDIUM

`dag/dag-tree.ts` imports from `config/` modules. Low-level DAG depends on high-level config.

---

## Large Files (>800 lines)

| File | Lines | Problem |
|------|-------|---------|
| `core/src/config/task-definition.ts` | 1,891 | 63 exports: types, builder, guards, contexts, checks in one file |
| `core/src/executor/seed-executor.ts` | 1,849 | AI + script execution monolithic |
| `cli/src/next-task.ts` | 1,669 | `getTaskStates()` alone is ~1,200 lines |
| `cli/src/main.ts` | 1,707 | Arg parsing + playbook detection + dispatch + help |
| `core/src/dag/dag-tree.ts` | 1,401 | Deprecated but still used |
| `core/src/task/lifecycle/task-runner.ts` | 1,401 | Old execution pipeline |
| `core/src/run.ts` | 1,069 | Compile + DAG + state + reporting + resume |
| `core/src/executor/spawn-runner.ts` | 1,098 | Spawn + inline template code |
| `core/src/navigator/repair/strategies/dependency-backoff.ts` | 992 | Single strategy approaching 1K |
| `core/src/navigator/repair/agent-runner.ts` | 955 | AI agent repair runner |

---

## 14 TODO/FIXME stubs

Notable unimplemented:
- `planning/replan-engine.ts:307` — `TODO: Implement task logic`
- `runtime/task-manager.ts:39` — `TODO: Actual task execution`
- `planning/task-file-generator.ts:266` — `TODO: Implement task logic`
- `task/checks/builders.ts:796` — `TODO: Implement verification`
- `executor/function-executor.ts:409` — `TODO: Integrate with claudefn`
- `orchestrator/project-orchestrator.ts:85,96` — `throw new Error("not yet implemented")`

---

## Refactoring Roadmap

| Phase | What | Impact |
|-------|------|--------|
| **1. Dead code removal** | Delete dead files, functions, exports | **DONE** — 7,400+ lines removed |
| **2. Structural fixes** | Fix broken imports, deduplicate, barrel exports | **DONE** |
| **3. Resolve dual pipeline** | Remove old `executeTask`, sunset `task-runner.ts` | ~1,400 lines removed |
| **4. Finish TaskTree→TaskDag** | Migrate consumers, delete `dag/dag-tree.ts` | ~1,400 lines removed |
| **5. Navigator cleanup** | Merge fork into `@converge/navigator` or delete standalone | Eliminates fork |
| **6. Split large files** | Start with `task-definition.ts` (1,891→~400) | Readability |
| **7. Quality cleanup** | Replace `as any`, standardize extensions, resolve TODOs | Maintainability |

---

## Verification

After each phase:
- `pnpm build` on core + cli — clean
- `pnpm typecheck` — zero new errors
- CLI smoke test: `node packages/cli/dist/main.js --help`
