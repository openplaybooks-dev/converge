---
id: tier-1c
title: "Tier 1c — Move next-task.ts to core/planning/task-selection.ts"
blocking: true
checks:
  - id: core-builds
    cmd: "pnpm -F @openplaybooks/converge-core build 2>&1 | tail -3"
    description: "@openplaybooks/converge-core compiles"
  - id: cli-builds
    cmd: "pnpm -F @openplaybooks/converge-cli build 2>&1 | tail -3"
    description: "@openplaybooks/converge-cli compiles against new core"
  - id: cli-smoke
    cmd: "node packages/cli/dist/index.js --help >/dev/null 2>&1"
    description: "converge --help runs"
  - id: tree-smoke
    cmd: "cd examples/game-assets-video && pnpm exec converge tree >/dev/null 2>&1"
    description: "converge tree (heavy user of task-selection) runs"
  - id: dry-run-smoke
    cmd: "cd examples/game-assets-video && pnpm exec converge run --dry >/dev/null 2>&1"
    description: "converge run --dry exercises calculateExecutionPlan + findNextIncompleteTask"
  - id: task-selection-moved
    cmd: "test -f packages/core/src/planning/task-selection.ts && ! test -f packages/cli/src/next-task.ts"
    description: "next-task.ts moved to core/planning/task-selection.ts; CLI source deleted"
  - id: no-require-calls
    cmd: "test -z \"$(grep -nE 'require\\(' packages/core/src/planning/task-selection.ts 2>/dev/null)\""
    description: "ESM only — no require() calls"
  - id: no-converge-debug-deps-env
    cmd: "test -z \"$(grep -n 'CONVERGE_DEBUG_DEPS' packages/core/src/planning/task-selection.ts 2>/dev/null)\""
    description: "Debug env-var reads replaced with logger.debug calls"
  - id: rename-applied
    cmd: "grep -q 'findNextIncompleteTask' packages/core/src/index.ts && ! grep -q 'export.*findNextTask[^I]' packages/core/src/index.ts"
    description: "findNextTask renamed to findNextIncompleteTask in core's public API (no collision with TaskTree.findNextTask)"
---

# Tier 1c — Move next-task.ts to core/planning/task-selection.ts

**Summary:** Move the task-selection / planning module (~1,784 lines) from CLI to core. Rename the exported `findNextTask` to `findNextIncompleteTask` to avoid colliding with `TaskTree.findNextTask` already in core. Replace synchronous `require('node:fs')` with ESM imports. Replace `CONVERGE_DEBUG_DEPS` env-var reads with `logger.debug`.

## What to do

### File to move

| Source (CLI)                       | Destination (core)                              | Lines |
|------------------------------------|-------------------------------------------------|-------|
| `packages/cli/src/next-task.ts`    | `packages/core/src/planning/task-selection.ts`  | 1,784 |

In Tier 1a we already created `packages/core/src/planning/types.ts` holding `TaskStates` and `TaskNode`. Move the implementations into the same directory and re-export the types from `task-selection.ts` for caller convenience.

### Required transforms inside the moved file

1. **Rename the exported `findNextTask`** → `findNextIncompleteTask`. The TaskTree class in `core/task/tree/` already has its own `findNextTask` method; both being public on `@openplaybooks/converge-core` would collide. The CLI's version operates on a planning result, not a tree, so the new name is more accurate anyway.
2. **Replace `require('node:fs')` (line 717 in source) with an ESM `import` at the top of the file.** This `require` works under Node but breaks under bundlers (Bun, Vite, Studio). Move the `existsSync` (or whichever symbol is used there) to the top-of-file imports.
3. **Replace 15 sites of `process.env.CONVERGE_DEBUG_DEPS`** with `logger.debug(...)` calls. The function should accept an optional `logger?: Logger` parameter. The logger itself decides whether to emit debug output.
4. Update `@openplaybooks/converge-core/...` relative imports to be relative-to-the-new-location.
5. **Do not** wholesale-replace `console.*` in this tier unless the analyze step finds them — `next-task.ts` is mostly pure planning logic; it likely has fewer console calls than `autonomous-run.ts`. Run `grep -c 'console\.' packages/cli/src/next-task.ts` during analyze to confirm.
6. Remove `as any` casts only if trivially typeable; otherwise leave them — this is a move, not a refactor.

### CLI-side updates

- `packages/cli/src/reconcile.ts` already moved to core in Tier 1a; if the tier-1a fix used a temporary types-only `core/planning/types.ts`, the import there now becomes `import { buildTaskTree, getTaskStates } from '../planning/task-selection.js';`.
- `packages/cli/src/commands-tree.ts` — update its import from `./next-task.ts` to `@openplaybooks/converge-core`.
- `packages/cli/src/tree-display.ts` — update its `ExecutionSpan` import to `@openplaybooks/converge-core`.
- `packages/cli/src/autonomous-run.ts` — update its `findNextTask` import to `findNextIncompleteTask` from `@openplaybooks/converge-core`. (autonomous-run.ts is still in CLI at this tier; it migrates in 1d.)
- Any other site importing from `./next-task` — update.
- Delete `packages/cli/src/next-task.ts`.

### Public API

Add to `packages/core/src/index.ts`:
```ts
export {
  buildTaskTree,
  getTaskStates,
  calculateExecutionPlan,
  findNextIncompleteTask,
  type ExecutionSpan,
  type TaskStates,
  type TaskNode,
} from "./planning/task-selection.ts";
```
(Move the type re-export from `./planning/types.ts` if cleaner.)

### Manual verification (not in `checks:`, do this last)

Capture `converge tree` and `converge run --dry` output before and after this tier on `examples/game-assets-video` — they must produce equivalent task ordering and state. Colors and timestamps don't count; what matters is the same tasks in the same order with the same statuses.
