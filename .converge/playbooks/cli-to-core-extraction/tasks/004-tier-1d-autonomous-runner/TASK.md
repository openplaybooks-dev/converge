---
id: tier-1d
title: "Tier 1d — Move autonomous-run.ts to core/runner/autonomous.ts"
blocking: true
checks:
  - id: core-builds
    cmd: "pnpm -F @openplaybooks/converge-core build 2>&1 | tail -3"
    description: "@openplaybooks/converge-core compiles"
  - id: cli-builds
    cmd: "pnpm -F @openplaybooks/converge-cli build 2>&1 | tail -3"
    description: "@openplaybooks/converge-cli compiles"
  - id: cli-smoke
    cmd: "node packages/cli/dist/index.js --help >/dev/null 2>&1"
    description: "converge --help runs"
  - id: dry-run
    cmd: "cd examples/game-assets-video && pnpm exec converge run --dry >/dev/null 2>&1"
    description: "converge run --dry succeeds"
  - id: one-iteration
    cmd: "cd examples/game-assets-video && pnpm exec converge run --max-iterations 1 >/dev/null 2>&1"
    description: "One real iteration of the orchestration loop runs end-to-end"
  - id: autonomous-moved
    cmd: "test -f packages/core/src/runner/autonomous.ts && ! test -f packages/cli/src/autonomous-run.ts"
    description: "autonomous-run.ts moved to core/runner/autonomous.ts; CLI source deleted"
  - id: events-module-exists
    cmd: "test -f packages/core/src/runner/events.ts"
    description: "RunEventEmitter contract is defined in core"
  - id: no-console-in-runner
    cmd: "test -z \"$(grep -n 'console\\.' packages/core/src/runner/autonomous.ts 2>/dev/null)\""
    description: "No console.* in the moved orchestration loop (logger only)"
  - id: no-process-exit-in-runner
    cmd: "test -z \"$(grep -n 'process\\.exit' packages/core/src/runner/autonomous.ts 2>/dev/null)\""
    description: "No process.exit in core (returns or throws instead)"
  - id: no-chalk-in-runner
    cmd: "test -z \"$(grep -rn 'chalk' packages/core/src/runner 2>/dev/null)\""
    description: "No chalk/ANSI dependency in core/runner"
  - id: no-global-back-channels
    cmd: "test -z \"$(grep -rln '__CONVERGE_LAST_BAIL__\\|__CONVERGE_CURRENT_TASK__' packages/core/src 2>/dev/null)\""
    description: "(global as any).__CONVERGE_*__ back-channels eliminated"
  - id: run-autonomous-exported
    cmd: "grep -q 'runAutonomous' packages/core/src/index.ts && grep -q 'AutonomousRunConfig' packages/core/src/index.ts"
    description: "runAutonomous + AutonomousRunConfig exported from @openplaybooks/converge-core"
  - id: events-exported
    cmd: "grep -q 'RunEventEmitter' packages/core/src/index.ts"
    description: "RunEventEmitter type exported from @openplaybooks/converge-core"
  - id: programmatic-smoke
    cmd: "cd examples/game-assets-video && node --input-type=module -e \"import('@openplaybooks/converge-core').then(async m => { const cfg = await m.loadConvergeConfig(process.cwd()); const r = await m.runAutonomous({ projectDir: process.cwd(), convergeConfig: cfg.config ?? cfg, maxIterations: 1, logger: m.createDefaultLogger() }); if (typeof r.iterations !== 'number') process.exit(1); }\" 2>&1 | tail -5"
    description: "Programmatic runAutonomous() works without invoking CLI code (the whole point of the refactor)"
---

# Tier 1d — Move autonomous-run.ts to core/runner/autonomous.ts (the heart)

**Summary:** Move the SNAP→FIND→EXECUTE→COMMIT loop (~1,725 lines) into core. This is the largest and most coupled file. Replace 60+ `console.*` with logger; replace 5 `process.exit` with throws/returns; remove `(global as any).__CONVERGE_*__` back-channels with explicit run-context fields; replace the lazy CLI `import('./run-event-stream.ts')` with a typed `RunEventEmitter` injected via `opts`. Defines the programmatic API surface for `runAutonomous()`.

## What to do

### File to move

| Source (CLI)                          | Destination (core)                       | Lines |
|---------------------------------------|------------------------------------------|-------|
| `packages/cli/src/autonomous-run.ts`  | `packages/core/src/runner/autonomous.ts` | 1,725 |

This is the heart of converge. After this tier, `runAutonomous()` is a real programmatic API exported from `@openplaybooks/converge-core`.

### Prerequisites (must be done first)

- Tier 1a (`acquirePlaybookLock`, `reconcile`) — already in core.
- Tier 1b (`fabrication-scanner`, `error-classification`) — already in core.
- Tier 1c (`task-selection.ts` with `findNextIncompleteTask`) — already in core.

If any prereq is missing, STOP and surface it.

### New file: `packages/core/src/runner/events.ts`

Define the typed event emitter that replaces the lazy CLI import:

```ts
export type RunEvent =
  | { type: 'run.start'; ts: number; projectDir: string; convergeConfig: unknown }
  | { type: 'run.end'; ts: number; result: AutonomousRunResult }
  | { type: 'iteration'; ts: number; iteration: number; nextTaskId?: string }
  | { type: 'task.start'; ts: number; taskId: string; sessionId: string }
  | { type: 'task.complete'; ts: number; taskId: string; success: boolean; durationMs: number }
  | { type: 'gap'; ts: number; gap: GapInfo };

export interface RunEventEmitter {
  emit(ev: RunEvent): void;
}
```

The exact event payload fields should match what `cli/src/run-event-stream.ts` emits today — read that file during analyze to enumerate them. Don't add new event types in this tier.

### Required transforms inside the moved file

1. **Replace 60+ `console.log/error/warn` calls** with `logger.{info|warn|error|debug}(...)`. `runAutonomous` is a function, not a class — pass `logger` from the config in. The bulk of this tier's work is mechanical replacement.
2. **Replace 5 `process.exit` calls** (lines ~979, ~1097, ~1681 in source). Each becomes either:
   - A return: `return { completed: false, tasksCompleted, tasksFailed, iterations, stoppedReason: 'timeout' | 'max-iterations' | 'consecutive-failures' };`
   - Or a thrown error: `throw new RunDirtySessionError(...)` for the dirty-session guard. The CLI translates these to exit codes.
3. **Remove `(global as any).__CONVERGE_LAST_BAIL__` and `(global as any).__CONVERGE_CURRENT_TASK__`** (lines ~1484, ~1499, ~1658 in source). These are back-channels between sub-functions. Replace with a `RunContext` object passed explicitly:
   ```ts
   interface RunContext {
     lastBail?: { taskId: string; reason: string };
     currentTask?: { id: string; sessionId: string };
   }
   ```
   Threading the context through the call sites is the only behavior change permitted in this tier. Without it, two concurrent `runAutonomous` calls in one process collide.
4. **Replace lazy `await import("./run-event-stream.ts")`** with `events?.emit({ type: ..., ts: Date.now(), ... })`. `events: RunEventEmitter | undefined` comes in via the `AutonomousRunConfig`.
5. **No `process.exit`, no `console.*`, no `chalk`** in the moved file. Verify with grep before declaring done.
6. Update relative imports to point at the new core-internal paths: `core/checkpoint/manager.ts`, `core/runner/fabrication-scanner.ts`, `core/runner/error-classification.ts`, `core/planning/task-selection.ts`, etc.

### CLI-side updates

- Delete `packages/cli/src/autonomous-run.ts`.
- `packages/cli/src/run-event-stream.ts` stays in CLI but is rewired: it now implements `RunEventEmitter` from core. Its `emit(ev)` writes the NDJSON line. The CLI's `commands-run.ts` constructs the emitter and passes it to `runAutonomous` via `events: emitter`.
- `packages/cli/src/commands-run.ts` — replace `import { autonomousRun } from "./autonomous-run.ts"` with `import { runAutonomous } from "@openplaybooks/converge-core"`. Build a colored-output logger and pass it. Build the `RunEventEmitter` from `run-event-stream.ts` if `--events <path>` was given. Translate the result's `stoppedReason` into the right exit code.
- The CLI's SIGINT/SIGTERM handlers stay where they are; they `controller.abort()` an `AbortController` whose `signal` is passed to `runAutonomous`. (If `runAutonomous` doesn't yet accept a signal, that's a separate small enhancement — surface it during analyze. The current code uses `AbortController` internally for subprocess cancellation; it just needs to accept an externally supplied signal.)

### Public API

Add to `packages/core/src/index.ts`:
```ts
export {
  runAutonomous,
  type AutonomousRunConfig,
  type AutonomousRunResult,
  RunDirtySessionError, // and any other typed errors thrown
} from "./runner/autonomous.ts";
export type { RunEvent, RunEventEmitter } from "./runner/events.ts";
```

### Manual verification (not in `checks:`, do these last)

1. **Restart path:** `cd examples/game-assets-video && pnpm exec converge --restart run --max-iterations 1`. Must reset state and run.
2. **Resume path:** `cd examples/game-assets-video && pnpm exec converge --resume run --max-iterations 1`. Must pick up where the previous run left off.
3. **Event stream parity:** capture `pnpm exec converge run --events /tmp/before.ndjson --max-iterations 1` before the move (or compare against an existing capture). After the move, run with `--events /tmp/after.ndjson` and confirm event types and payload shapes match.
4. **Lock contention:** two `converge run` invocations against the same project — second must exit 1 cleanly via `PlaybookLockHeldError` (the typed error from Tier 1a), not a `process.exit` from inside core.
