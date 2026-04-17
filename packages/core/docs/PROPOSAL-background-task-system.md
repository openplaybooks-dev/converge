# Proposal: Background Task System, Scheduled Tasks & Sidecar Processes

**Date:** 2026-04-06  
**Updated:** 2026-04-06  
**Status:** Draft v5 — Unified `.execute()` API  
**Scope:** `converge/packages/core` — new runtime primitives

---

## 1. Problem Statement

The current Converge framework executes tasks **synchronously and sequentially** within the convergence loop. This creates problems for:

1. **Long-running processes** (dev servers) that must stay alive while downstream tasks execute against them
2. **Periodic validation** (typecheck, health checks) that should run on a timer regardless of task state
3. **Cross-cutting concerns** (git commit, lint) that should hook into other tasks' lifecycle events
4. **Expensive parallel work** (AI generation, builds) that shouldn't block independent sibling tasks

---

## 2. Core Principle: One Execution Primitive

Every task does one thing: **execute a function**. The modifiers control *how* it runs.

```typescript
taskDef()
  .id('...')
  .title('...')
  .execute(async (ctx) => { ... })   // WHAT to run — always the same
  .async()                            // HOW: non-blocking, await later
  .background({ readyWhen, ... })     // HOW: keep alive, don't complete
  .schedule('15s')                    // HOW: re-run on interval
  .sidecar({ 'task:complete': ... })  // WHEN: hook into lifecycle events
  .build()
```

**No modifier** = normal foreground task (sequential, blocking, runs once).

The key: `.execute()` is always the same function signature `(ctx) => Promise<T>`. The modifier changes the execution strategy, not the function itself.

---

## 3. Execution Model: `unit.run` → `convergeFn` → `executeFn`

The user writes `.execute(fn)`. But that `fn` never runs bare — it's wrapped by the converge convergence machinery. Understanding this layering is critical:

```
unit.run(task)                          ← convergence loop (gap detect → fix → retry)
  └─ convergeFn(ctx)                     ← convergence policy (run → check outputs → check gaps)
      └─ ctx.run()                      ← single iteration
          └─ TaskExecutor.run(executeFn) ← user's .execute() function
              └─ executeFn(ctx)          ← user code
```

**What each layer does:**

| Layer | Responsibility |
|-------|---------------|
| `unit.run()` | Outer convergence loop. Detects gaps, plans fixes, retries. Calls `convergeFn` per iteration. |
| `convergeFn(ctx)` | Per-iteration policy. Calls `ctx.run()` (the executor), then checks outputs and validations. Returns `{ converged: boolean }`. |
| `ctx.run()` → `TaskExecutor` | Wraps the user's function with `ExecutorContext` (AI, shell, spawn). Catches errors. |
| `executeFn(ctx)` | The user's `.execute()` function. Pure task logic. |

**The modifiers change how `unit.run` orchestrates, not what `executeFn` does:**

| Modifier | What `unit.run` does differently |
|----------|----------------------------------|
| *(none)* | Runs `convergeFn` → `executeFn` sequentially, blocks until converged |
| `.async()` | Same as default, but `unit.run` returns a handle immediately. The convergence loop runs in a separate "lane". Siblings proceed. |
| `.background()` | `unit.run` starts `executeFn`, waits for `readyWhen`, then marks task as "ready" (not "complete"). The process keeps running. `unit.run` never returns "converged" — it stays alive. |
| `.schedule('15s')` | `unit.run` calls `convergeFn` → `executeFn` on an interval. Each invocation is a fresh convergence iteration. |
| `.sidecar({...})` | `unit.run` subscribes hook callbacks to `HookRegistry`. Optionally runs `executeFn` once for init. Hooks fire independently of the convergence loop. |

**Converge wrapping is the same for all modifiers.** The default `convergeFn` always does:

```typescript
async (ctx) => {
  const result = await ctx.run();           // run executeFn
  if (!result.success) return { converged: false };
  const outputsOk = await ctx.checkOutputs();
  if (!outputsOk) return { converged: false };
  for (const check of checks) {
    if (!await ctx.runCheck(check.id)) return { converged: false };
  }
  return { converged: true };
}
```

This means **all modifiers get convergence for free**: output checks, gap detection, retry logic. The modifier only controls scheduling and lifetime — not validation.

---

## 4. The Five Modes

### 4.1 No Modifier — Normal Task (default)

`.execute()` runs once, blocks the task graph until it completes, returns a `TaskResult`.

```typescript
taskDef()
  .id('install-deps')
  .title('Install Dependencies')
  .execute(async (ctx) => {
    await ctx.shell('npm install');
  })
  .build()
```

This is identical to today's `.run()`. Just a rename for consistency.

### 4.2 `.async()` — Non-Blocking Execution

`.execute()` starts immediately but **doesn't block siblings**. Dependents await implicitly via `deps()`.

```typescript
// These two start in parallel — neither blocks the other
taskDef()
  .id('generate-assets')
  .title('Generate SVG Assets')
  .async()
  .execute(async (ctx) => {
    await ctx.ai.fn({ prompt: 'Generate all SVG icons...' });
    return { icons: 12 };
  })
  .build()

taskDef()
  .id('generate-pages')
  .title('Generate Pages')
  .async()
  .execute(async (ctx) => {
    await ctx.ai.fn({ prompt: 'Generate all page components...' });
    return { pages: 8 };
  })
  .build()

// This waits for both — deps on async tasks = implicit await
taskDef()
  .id('typecheck')
  .title('Typecheck')
  .deps(['generate-assets', 'generate-pages'])
  .execute(async (ctx) => {
    await ctx.shell('npx tsc --noEmit');
  })
  .build()
```

**Without `.async()`:**
```
install → generate-assets (2 min, blocks) → generate-pages (1 min) → typecheck
                                                                       Total: ~4 min
```

**With `.async()`:**
```
install → generate-assets ──┐
        → generate-pages  ──┤ (parallel)
                             └→ typecheck (waits for both via deps)
                                                          Total: ~2 min
```

**Explicit await inside a parent task:**

```typescript
taskDef()
  .id('build-all')
  .title('Build Everything')
  .execute(async (ctx) => {
    // Start two tasks, don't wait yet
    const assets = ctx.start('generate-assets');
    const pages = ctx.start('generate-pages');

    // Do other work while they run
    await ctx.shell('npm run lint');

    // Now await results
    const assetResult = await assets;
    const pageResult = await pages;
    ctx.log.info(`${assetResult.icons} icons, ${pageResult.pages} pages`);
  })
  .build()
```

**`ctx.start(id)` returns an `AsyncHandle`:**

```typescript
interface AsyncHandle<T = TaskResult> {
  id: string;
  status: 'running' | 'completed' | 'failed';
  then: Promise<T>['then'];   // thenable — works with await
  cancel(): Promise<void>;
}
```

### 4.3 `.background(config)` — Keep Alive

`.execute()` runs and **stays alive** until the epic ends. The function is expected to start a long-running process. Downstream tasks access its state via `ctx.bg(id)`.

```typescript
taskDef()
  .id('dev-server')
  .title('Start Dev Server')
  .background({
    readyWhen: /✓ Ready in/,
    healthCheck: 'http://localhost:3000',
  })
  .execute(async (ctx) => {
    // The execute fn IS the process — same signature as any other task
    await ctx.shell('npx next dev --turbopack');
  })
  .build()
```

The `.background()` modifier tells the orchestrator:
- Don't mark the task "complete" when `.execute()` resolves — keep it alive
- Wait for `readyWhen` pattern in stdout before unblocking dependents
- Optionally poll `healthCheck` URL
- Auto-stop when the epic completes or fails
- Write state to `.converge/runtime/bg/<task-id>/`

**Downstream tasks interact via `ctx.bg(id)`:**

```typescript
taskDef()
  .id('verify-pages')
  .title('Verify All Pages')
  .deps(['dev-server'])
  .execute(async (ctx) => {
    await ctx.ai.fn({ prompt: 'Fix the Home page layout...' });

    // Check if our changes broke dev
    const dev = ctx.bg('dev-server');
    await dev.waitForIdle();

    const errors = dev.errorsSince(ctx.startTime);
    if (errors.length > 0) {
      for (const err of errors) {
        await ctx.ai.fn({
          prompt: `Fix: ${err}`,
          context: { filesChanged: ctx.modifiedFiles() }
        });
      }
      await dev.waitForIdle();
    }
  })
  .build()
```

**`ctx.bg(id)` handle:**

```typescript
interface BgHandle {
  status: 'starting' | 'ready' | 'degraded' | 'stopped' | 'crashed';
  waitForIdle(timeout?: number): Promise<void>;
  waitForReady(timeout?: number): Promise<void>;
  errorsSince(time: number): string[];
  output: AsyncIterable<string>;
  stop(): Promise<void>;
}
```

**Background config:**

```typescript
interface BackgroundConfig {
  readyWhen: RegExp | string;
  readyTimeout?: number;          // default 30s
  healthCheck?: string | {        // URL or config
    url: string;
    interval?: number;            // default 5000ms
    failureThreshold?: number;    // default 3
  };
  restartOnCrash?: boolean;       // default false
  maxRestarts?: number;           // default 3
}
```

Note: no `command` field — the command lives in `.execute()`, not in the config. The config only has *behavior modifiers*.

### 4.4 `.schedule(interval)` — Re-Run on Timer

`.execute()` runs repeatedly on the given interval. Same function, called over and over.

```typescript
taskDef()
  .id('typecheck-watcher')
  .title('Periodic Typecheck')
  .schedule('15s')
  .execute(async (ctx) => {
    const result = await ctx.shell('npx tsc --noEmit');

    if (result.exitCode === 0) {
      ctx.resolveGaps('typecheck');
      return;
    }

    // Self-fix
    await ctx.ai.fn({ prompt: `Fix TypeScript errors:\n${result.stderr}` });

    const recheck = await ctx.shell('npx tsc --noEmit');
    if (recheck.exitCode !== 0) {
      ctx.emitGap({
        severity: 'high',
        description: 'TypeScript errors (self-fix failed)',
        tags: ['typecheck'],
        output: recheck.stderr,
      });
    }
  })
  .build()
```

```typescript
taskDef()
  .id('health-monitor')
  .title('Health Monitor')
  .schedule('5s')
  .execute(async (ctx) => {
    try {
      const res = await fetch('http://localhost:3000');
      if (res.status !== 200) {
        ctx.emitGap({ severity: 'critical', description: `Dev returned ${res.status}` });
      }
    } catch {
      ctx.emitGap({ severity: 'critical', description: 'Dev server unreachable' });
    }
  })
  .build()
```

**Interval format:** `'5s'`, `'15s'`, `'1m'`, `'5m'` — simple duration strings.

**With options:**
```typescript
.schedule('15s')                                    // simple
.schedule('15s', { runImmediately: true })           // run once at start (default: true)
.schedule('15s', { skipIfBusy: true })               // don't overlap (default: true)
```

Auto-stops when the epic completes or fails.

### 4.5 `.sidecar(hooks)` — Lifecycle-Triggered Execution

`.execute()` is optional for sidecars. The hook callbacks *are* the execution. But you can also provide an `.execute()` for init/setup logic.

```typescript
taskDef()
  .id('git-checkpoint')
  .title('Auto Git Commit')
  .sidecar({
    'task:complete': async (event, ctx) => {
      const status = await ctx.shell('git status --porcelain');
      if (status.stdout.trim()) {
        await ctx.shell('git add -A');
        await ctx.shell(`git commit -m "checkpoint: ${event.taskId}"`);
      }
    },
  })
  .build()
```

```typescript
taskDef()
  .id('typecheck-guardian')
  .title('Typecheck Guardian')
  .sidecar({
    'task:complete': async (event, ctx) => {
      const result = await ctx.shell('npx tsc --noEmit');
      if (result.exitCode === 0) return;

      ctx.log.warn(`TS errors after ${event.taskId}, fixing...`);
      await ctx.ai.fn({ prompt: `Fix TS errors:\n${result.stderr}` });

      const recheck = await ctx.shell('npx tsc --noEmit');
      if (recheck.exitCode !== 0) {
        ctx.emitGap({
          severity: 'high',
          description: `TS errors after ${event.taskId} (self-fix failed)`,
          output: recheck.stderr,
        });
      }
    },
  })
  .build()
```

**With init logic:**
```typescript
taskDef()
  .id('test-watcher')
  .title('Test Watcher')
  .execute(async (ctx) => {
    // Runs once at sidecar start — setup
    await ctx.shell('npx jest --clearCache');
  })
  .sidecar({
    'task:complete': async (event, ctx) => {
      // Runs after every task
      await ctx.shell('npx jest --changed');
    },
  })
  .build()
```

**Available hooks:**

```typescript
type SidecarHook =
  | 'task:start'
  | 'task:complete'
  | 'task:fail'
  | 'task:retry'
  | 'gap:detected'
  | 'gap:resolved'
  | 'epic:start'
  | 'epic:complete'
  | 'convergence:stalled';
```

Sidecars start before the first task and stop when the epic ends.

---

## 5. Composing Modifiers

Modifiers are composable. A task can combine them:

```typescript
// Typecheck: runs both on a timer AND after every task completion
taskDef()
  .id('typecheck-guardian')
  .title('TypeScript Guardian')
  .schedule('30s')
  .sidecar({ 'task:complete': typecheckAndFix })
  .execute(typecheckAndFix)    // same fn used everywhere
  .build()

async function typecheckAndFix(ctx) {
  const result = await ctx.shell('npx tsc --noEmit');
  if (result.exitCode === 0) return;
  await ctx.ai.fn({ prompt: `Fix TS errors:\n${result.stderr}` });
}
```

```typescript
// Background process with additional scheduled health check
taskDef()
  .id('dev-server')
  .title('Dev Server')
  .background({ readyWhen: /✓ Ready in/, healthCheck: 'http://localhost:3000' })
  .schedule('10s')
  .execute(async (ctx) => {
    await ctx.shell('npx next dev --turbopack');
  })
  .build()
```

**Incompatible combos** (build-time error):
- `.async()` + `.background()` — async completes, background stays alive. Pick one.

---

## 6. Comparison Table

| | Default | `.async()` | `.background()` | `.schedule('15s')` | `.sidecar({...})` |
|---|---------|-----------|-----------------|-------------------|--------------------|
| **Runs** | Once, blocking | Once, non-blocking | Once, stays alive | Repeatedly on timer | On lifecycle events |
| **Blocks siblings** | Yes | No | No (after ready) | No | No |
| **Has result** | Yes | Yes (await later) | No | No | No |
| **Lifetime** | Until fn returns | Until fn returns | Until epic ends | Until epic ends | Until epic ends |
| **`.execute()` called** | Once | Once | Once | Every interval | Once (init) |
| **Use case** | Sequential work | Parallel work | Dev server | Health checks | Git commit, lint |

---

## 7. Epic-Level Declaration

All tasks — regardless of modifier — are declared the same way in the epic:

```typescript
// epic.ts
export const tasks = [
  // Background: dev server
  taskDef()
    .id('dev-server')
    .title('Dev Server')
    .background({ readyWhen: /✓ Ready in/, healthCheck: 'http://localhost:3000' })
    .execute(async (ctx) => {
      await ctx.shell('npx next dev --turbopack');
    })
    .build(),

  // Sidecar: git auto-commit
  taskDef()
    .id('git-checkpoint')
    .title('Git Checkpoint')
    .sidecar({
      'task:complete': async (event, ctx) => {
        const status = await ctx.shell('git status --porcelain');
        if (status.stdout.trim()) {
          await ctx.shell('git add -A');
          await ctx.shell(`git commit -m "checkpoint: ${event.taskId}"`);
        }
      },
    })
    .build(),

  // Sidecar: typecheck guardian
  taskDef()
    .id('typecheck-guardian')
    .title('Typecheck Guardian')
    .sidecar({
      'task:complete': async (event, ctx) => {
        const result = await ctx.shell('npx tsc --noEmit');
        if (result.exitCode === 0) return;
        await ctx.ai.fn({ prompt: `Fix TS errors:\n${result.stderr}` });
      },
    })
    .build(),

  // Scheduled: health monitor
  taskDef()
    .id('health-monitor')
    .title('Health Monitor')
    .schedule('5s')
    .execute(async (ctx) => {
      const res = await fetch('http://localhost:3000');
      if (!res.ok) ctx.emitGap({ severity: 'critical', description: 'Dev unreachable' });
    })
    .build(),

  // Async: parallel generation
  taskDef()
    .id('generate-assets')
    .title('Generate Assets')
    .async()
    .execute(async (ctx) => {
      await ctx.ai.fn({ prompt: 'Generate all SVG icons...' });
    })
    .build(),

  taskDef()
    .id('generate-pages')
    .title('Generate Pages')
    .async()
    .execute(async (ctx) => {
      await ctx.ai.fn({ prompt: 'Generate page components...' });
    })
    .build(),

  // Normal: sequential foreground tasks
  taskDef()
    .id('install-deps')
    .title('Install Dependencies')
    .execute(async (ctx) => { await ctx.shell('npm install'); })
    .build(),

  taskDef()
    .id('typecheck')
    .title('Typecheck')
    .deps(['install-deps', 'generate-assets', 'generate-pages'])
    .execute(async (ctx) => { await ctx.shell('npx tsc --noEmit'); })
    .build(),

  taskDef()
    .id('verify-pages')
    .title('Verify Pages')
    .deps(['dev-server', 'typecheck'])
    .execute(async (ctx) => {
      await ctx.ai.fn({ prompt: 'Verify all pages render correctly...' });
    })
    .build(),

  taskDef()
    .id('smoke-test')
    .title('Smoke Test')
    .deps(['verify-pages'])
    .execute(async (ctx) => {
      await ctx.shell('npx playwright test');
    })
    .build(),
];
```

**The orchestrator infers execution strategy from modifiers:**
- No modifier → run once, block until complete
- `.async()` → run once, don't block siblings, dependents await
- `.background()` → run once, keep alive until epic ends
- `.schedule('...')` → re-run on interval until epic ends
- `.sidecar({...})` → subscribe to hooks, fire on events

---

## 8. Reactive Gap Flow

Three resolution paths, ordered by speed:

### Path A: Task Fixes Its Own Breakage (Inline)
```
Task modifies code → dev server errors → task checks ctx.bg('dev-server').errorsSince() → task fixes it
```
Fastest — sub-second. Gap never reaches convergence loop.

### Path B: Sidecar/Scheduled Self-Fix
```
Task completes → typecheck-guardian fires → finds TS errors → self-fixes with AI → verifies
```
Seconds. Resolved by sidecar, never reaches convergence loop.

### Path C: Convergence Loop (Fallback)
```
Self-fix fails → gap emitted → convergence loop picks up → planner generates fix-task → executes
```
Safety net. Configurable max attempts before surfacing to user.

```
Task inline fix  →  Sidecar/scheduled self-fix  →  Convergence loop  →  Surface to user
   (fastest)           (seconds)                     (iteration)          (manual)
```

---

## 9. Gap API

```typescript
ctx.emitGap({
  severity: 'high' | 'critical' | 'medium' | 'low',
  description: string,
  tags?: string[],
  output?: string,
});

ctx.resolveGaps(tag: string);
ctx.resolveGap(gapId: string);
```

Deduplication and batching is internal to the orchestrator — not exposed.

---

## 10. Process State (Filesystem)

Background tasks write state to:

```
.converge/runtime/bg/<task-id>/
  status.json      # { status, pid, startedAt, readyAt }
  errors.jsonl     # streaming error log
  output.log       # stdout+stderr ring buffer
```

Enables both typed access (`ctx.bg(id)`) and simple filesystem reads.

---

## 11. Implementation Plan

### Phase 1: Unified `.execute()` + Normal Execution
- [ ] Rename `.run()` → `.execute()` (keep `.run()` as alias for backwards compat)
- [ ] Ensure `.execute()` is the single entry point for all task execution

### Phase 2: `.async()` — Non-Blocking Execution
- [ ] `.async()` builder flag
- [ ] `AsyncHandle` with thenable interface
- [ ] `ctx.start(id)` for explicit programmatic await
- [ ] Orchestrator parallel dispatch for async tasks
- [ ] `deps()` on async task = implicit await
- [ ] Error propagation from async to dependents

### Phase 3: `.background()` — Keep-Alive Execution
- [ ] `BackgroundConfig` type (no `command` — lives in `.execute()`)
- [ ] Internal `ProcessManager` (spawn, stop, health check)
- [ ] `BgHandle` with `waitForReady`, `waitForIdle`, `errorsSince`
- [ ] Filesystem state output (`.converge/runtime/bg/`)
- [ ] `ctx.bg(id)` accessor
- [ ] Auto-cleanup on epic completion

### Phase 4: `.schedule()` — Repeated Execution
- [ ] Duration string parser (`'5s'` → 5000ms)
- [ ] Interval runner with `skipIfBusy` overlap protection
- [ ] Auto-stop on epic completion

### Phase 5: `.sidecar()` — Event-Triggered Execution
- [ ] Hook map type and builder method
- [ ] Hook subscription into `HookRegistry`
- [ ] Optional `.execute()` for init logic
- [ ] Start before first task, stop after epic

### Phase 6: Gap Integration
- [ ] Internal gap deduplication and batching
- [ ] Merge reactive gaps into convergence loop
- [ ] Gap resolution tracking

### Phase 7: Checkpoint/Resume
- [ ] Serialize background/schedule state to checkpoint
- [ ] Re-spawn on resume

---

## 12. File Impact Analysis

| File | Change |
|------|--------|
| `src/functions/builders.ts` | Add `.execute()`, `.async()`, `.background()`, `.schedule()`, `.sidecar()` |
| `src/functions/types.ts` | `BackgroundConfig`, `AsyncHandle`, `ScheduleOpts`, `SidecarHooks` types |
| `src/storage/types.ts` | Extend `TaskConfig` with optional modifier fields |
| `src/context/task-context.ts` | Add `ctx.bg()`, `ctx.start()`, `ctx.emitGap()`, `ctx.resolveGaps()` |
| `src/context/types.ts` | Extended `TaskContext` interface |
| `src/orchestrator/convergence.ts` | Detect modifiers, dispatch execution strategy accordingly |
| `src/process/manager.ts` | **NEW** — Internal `ProcessManager` |
| `src/process/types.ts` | **NEW** — `BgHandle`, `ManagedProcess` internal types |
| `src/hooks/registry.ts` | Support sidecar hook subscriptions |
| `src/hooks/types.ts` | Add sidecar hook event types |

---

## 13. Open Questions

1. **Gap deduplication** — Time-based window (same error within 5s = same gap) or content hash?
2. **Sidecar ordering** — Should sidecar hooks fire in declaration order or concurrently?
3. **Background output buffer** — Ring buffer size? Default 1000 lines?
4. **Async concurrency limit** — Max parallel async tasks? (avoid 20 AI agents at once)
5. **Async cancellation** — When a sibling fails, cancel in-flight async tasks or let them finish?
6. **`.execute()` for background** — Should background tasks require `.execute()`, or allow a shorthand `.background({ command: '...' })` for simple cases?
