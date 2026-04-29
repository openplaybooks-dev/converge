---
id: tier-1a
title: "Tier 1a — Move playbook-lock and reconcile into core"
blocking: true
checks:
  - id: core-builds
    cmd: "pnpm -F @converge/core build 2>&1 | tail -3"
    description: "@converge/core compiles"
  - id: cli-builds
    cmd: "pnpm -F @converge/cli build 2>&1 | tail -3"
    description: "@converge/cli compiles against new core"
  - id: cli-smoke
    cmd: "node packages/cli/dist/index.js --help >/dev/null 2>&1"
    description: "converge --help runs"
  - id: tree-smoke
    cmd: "cd examples/game-assets-video && pnpm exec converge tree >/dev/null 2>&1"
    description: "converge tree runs against the example project"
  - id: lock-moved
    cmd: "test -f packages/core/src/locks/playbook.ts && ! test -f packages/cli/src/playbook-lock.ts"
    description: "playbook-lock moved to core; CLI source deleted"
  - id: reconcile-moved
    cmd: "test -f packages/core/src/checkpoint/reconcile.ts && ! test -f packages/cli/src/reconcile.ts"
    description: "reconcile moved to core; CLI source deleted"
  - id: planning-types-exists
    cmd: "test -f packages/core/src/planning/types.ts"
    description: "TaskStates/TaskNode types extracted to core/planning/types.ts"
  - id: no-console-in-locks
    cmd: "test -z \"$(grep -n 'console\\.' packages/core/src/locks/playbook.ts 2>/dev/null)\""
    description: "Lock module uses logger, not console.*"
  - id: no-console-in-reconcile
    cmd: "test -z \"$(grep -n 'console\\.' packages/core/src/checkpoint/reconcile.ts 2>/dev/null)\""
    description: "Reconcile uses logger, not console.*"
  - id: no-process-exit
    cmd: "test -z \"$(grep -n 'process\\.exit' packages/core/src/locks/playbook.ts packages/core/src/checkpoint/reconcile.ts 2>/dev/null)\""
    description: "No process.exit in moved files (throws/returns instead)"
  - id: no-signal-handlers
    cmd: "test -z \"$(grep -nE 'process\\.once|SIGINT|SIGTERM' packages/core/src/locks/playbook.ts 2>/dev/null)\""
    description: "Signal handlers stay in CLI, not core"
  - id: lock-error-exported
    cmd: "grep -q 'PlaybookLockHeldError' packages/core/src/index.ts"
    description: "PlaybookLockHeldError is part of core's public API"
---

# Tier 1a — Move playbook-lock and reconcile into core

**Summary:** Move two small, low-risk modules out of CLI: `playbook-lock.ts` (PID lock) and `reconcile.ts` (filesystem-vs-checkpoint reconciliation). Strip CLI-only side effects (signal handlers, `process.exit`, `console.*`) and re-export from `@converge/core`. This is the warmup tier.

## What to do

### Files to move

| Source (CLI)                       | Destination (core)                          | Lines |
|------------------------------------|---------------------------------------------|-------|
| `packages/cli/src/playbook-lock.ts`| `packages/core/src/locks/playbook.ts`       | 140   |
| `packages/cli/src/reconcile.ts`    | `packages/core/src/checkpoint/reconcile.ts` | 171   |

### Required transforms inside the moved files

#### `playbook-lock.ts` → `core/locks/playbook.ts`
- Replace `process.exit(1)` (line 84 in source) with `throw new PlaybookLockHeldError({ playbook, holderPid, startedAt, command, lockPath })`. Define `PlaybookLockHeldError` in the same file and export it.
- Replace all `console.warn`/`console.error` calls with calls on a passed-in `logger: Logger` (use `Logger` interface from `core/runtime/logger.ts`). If `logger` is omitted, default to a no-op logger (do NOT default to `createDefaultLogger()` because that writes to stdout).
- Remove the three process-level handlers (lines 118–137 in source: `process.once('SIGINT'|'SIGTERM'|'exit', ...)`). The CLI installs its own signal handlers; core only owns lock acquisition and release.
- Change the return type from `Promise<() => Promise<void>>` to `Promise<LockHandle>` where `interface LockHandle { release(): Promise<void>; lockPath: string; }`. The CLI wires `release()` into its own SIGINT handler.
- Export both `acquirePlaybookLock(projectDir, playbook, opts?: { logger?: Logger })` and the `LockHandle` / `PlaybookLockHeldError` types.

#### `reconcile.ts` → `core/checkpoint/reconcile.ts`
- Internal imports: `./next-task.js` is still in CLI at this tier (Tier 1c moves it). **Best option:** copy the small set of types (`TaskStates`, `TaskNode`) from `next-task.ts` into a new `core/planning/types.ts` file in 1a; Tier 1c will move the implementations next to those types. This avoids a CLI→core back-import.
- Replace `console.log` calls with calls on a passed-in `logger: Logger`. Change signature to `reconcile(projectDir: string, opts?: { silent?: boolean; logger?: Logger }): Promise<ReconciliationResult>`. The `silent` flag becomes shorthand for `logger: undefined`.
- The `as any` casts on lines 103–105 against `(checkpointBefore as any)?.completedTasks` are fragile — leave them for now (they predate this tier). Don't touch.

### CLI-side updates

- `packages/cli/src/playbook-lock.ts` — delete.
- `packages/cli/src/reconcile.ts` — delete.
- `packages/cli/src/commands-run.ts` — change `import { acquirePlaybookLock } from "./playbook-lock.ts"` to import from `@converge/core`. Wrap the call in `try { ... } catch (e) { if (e instanceof PlaybookLockHeldError) { process.stderr.write(formatLockHeldMessage(e)); process.exit(1); } throw e; }`. Pass a colored-output logger.
- `packages/cli/src/commands-tree.ts` — change `import { reconcile } from "./reconcile.ts"` to import from `@converge/core`. Pass `{ silent: opts.silent, logger: cliLogger }`.
- Install the SIGINT/SIGTERM handlers that previously lived in `playbook-lock.ts` somewhere in the CLI's run flow (likely `commands-run.ts`). They call `lockHandle.release()` and re-raise the signal so the process exits with the right code.

### Public API

Add to `packages/core/src/index.ts`:
```ts
export { acquirePlaybookLock, type LockHandle, PlaybookLockHeldError } from "./locks/playbook.ts";
export { reconcile, type ReconciliationResult } from "./checkpoint/reconcile.ts";
export type { TaskStates, TaskNode } from "./planning/types.ts";
```

### Manual verification (not in `checks:`, do this last)

Lock contention smoke test: run `converge run` in two shells against `examples/game-assets-video`. The second must exit 1 with a clear message naming the holder PID. The first must finish cleanly and remove the lock. Capture the second shell's exit code and message in your work output.
