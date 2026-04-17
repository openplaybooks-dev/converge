# Gap Detection & Repair

How Converge detects task failures and automatically repairs them.

---

## Overview

Every task runs inside a **convergence loop** that repeats: detect gaps, fix gaps, re-check. The system has four layers:

1. **`run.ts`** — pre-flight checks + convergence loop (orchestrator)
2. **`repair/playbook/`** — data-driven decision tree (navigator)
3. **`find-gaps.ts`** — detects what's wrong (gap detection)
4. **`fix-gaps.ts`** — dispatches to the right fixer (gap resolution)

Within gap resolution, a **strategy pipeline** tries repair strategies in priority order until one succeeds.

---

## 1. Playbook Decision Tree (`repair/playbook/`)

The convergence loop delegates all branching logic to a **Playbook Tree** — a single data structure that replaces the previous 455-line while loop of if/else chains.

### Architecture

```
run.ts
  │
  pre-flight checks (WBS skip, output skip) — unchanged
  │
  for iteration = 1..maxIterations:
    PlaybookTree.walk(ctx)
      │
      ├─ condition nodes: test ctx → branch to then/else
      ├─ action nodes:    call handler from registry → PlaybookResult
      ├─ sequence nodes:  run children in order, stop on done/bail
      ├─ fallthrough:     try options until one succeeds
      └─ select nodes:    AI picks from N options
      │
      returns PlaybookResult { action, success, retryMode, resolved }
    │
    action === 'done'     → return result.success
    action === 'bail'     → return false
    action === 'continue' → next iteration
```

### Node Types

The tree is a discriminated union of 5 node types:

| Type | Behavior |
|------|----------|
| `condition` | Evaluates `test(ctx)`, branches to `then` or `else` |
| `action` | Calls a named handler from the registry, chains to `onSuccess`/`onFailure` |
| `sequence` | Runs steps in order, stops on `done`/`bail` |
| `fallthrough` | Tries attempts in order, stops on first success |
| `select` | AI picks from N options (reuses existing AI infra) |

### Files

| File | Contents |
|------|----------|
| `repair/playbook/types.ts` | `PlaybookNode` union, `PlaybookContext`, `PlaybookResult`, `ActionHandler` |
| `repair/playbook/walker.ts` | `PlaybookTree` class — recursive `walk()` evaluator |
| `repair/playbook/default-tree.ts` | `DEFAULT_TREE` constant and condition helpers |
| `repair/playbook/actions.ts` | `buildActionRegistry()` — 13 action handlers wrapping existing code |

---

## 2. Default Tree Structure

The `DEFAULT_TREE` branches on `isFirstIteration`:

### Iteration 1 (First Run)

```
root (condition: isFirstIteration?)
  └─ then (sequence: iteration-1)
       ├─ detect-gaps           — findGaps(unit)
       ├─ has plan gap?         — resolve-plan via PlanExecutor
       ├─ resolve-wbs           — re-detect after plan, seed via WbsExecutor
       │                          done(success) if seeded, bail if failed
       ├─ resolve-blockers      — fix input blockers, bail if unresolvable
       ├─ run-executor          — executeInitial(unit)
       ├─ verify-outputs        — findGaps() post-execution, done if 0 gaps
       └─ advance-attempt       — archive wip/ for next iteration
```

### Iteration 2+ (Repair Loop)

```
root (condition: isFirstIteration?)
  └─ else (sequence: iteration-2-plus)
       ├─ detect-gaps           — findGaps(unit), log events
       ├─ no gaps?              — signal-converged (done)
       ├─ blockers?             — bail-blockers (fatal in iter 2+)
       ├─ fix-gaps              — builds strategy sub-tree, walks it
       ├─ re-verify             — ground-truth findGaps(), done if 0
       ├─ check-stall           — stall detection (max 3), bail if stuck
       └─ advance-attempt       — archive for next iteration
```

### Exit Conditions

| Condition | Result | Source |
|-----------|--------|--------|
| Pre-flight: all outputs exist | `true` | `run.ts` |
| Pre-flight: WBS already seeded | `true` | `run.ts` |
| WBS seeded successfully | `true` | `resolve-wbs` action |
| Blockers persist after fix (iter 1) | `false` | `resolve-blockers` action |
| 0 gaps after first execution | `true` | `verify-outputs` action |
| Blockers persist into iter 2+ | `false` | `bail-blockers` action |
| 0 gaps in iter 2+ | `true` | `signal-converged` / `re-verify` action |
| 3 consecutive stalls | `false` | `check-stall` action |
| Max iterations reached | `false` | `run.ts` |

---

## 3. Action Handlers

Each action handler wraps existing code and returns a `PlaybookResult`:

```typescript
interface PlaybookResult {
  action: 'continue' | 'done' | 'bail';
  success?: boolean;
  retryMode?: RetryMode;   // ← preserved from strategy resolution
  resolved?: number;
  reason?: string;
}
```

### Handler Registry

| Handler | Wraps | Key behavior |
|---------|-------|-------------|
| `detect-gaps` | `findGaps(unit)` | Sets `ctx.gaps` and `ctx.previousGaps` |
| `signal-converged` | — | Returns `done(success)` |
| `signal-bail` | — | Returns `bail(failure)` |
| `resolve-plan` | `fixGaps(unit, [planGap])` | Delegates to PlanExecutor |
| `resolve-wbs` | `fixGaps(unit, [wbsGap])` | Delegates to WbsExecutor, done if seeded |
| `resolve-blockers` | `fixGaps(unit, blockers)` | Re-verifies after fix, bails if stuck |
| `run-executor` | `executeInitial(unit)` | Runs task via existing execute.ts |
| `verify-outputs` | `findGaps(unit)` post-execution | Validates with event logging |
| `bail-blockers` | checks for blocker gaps | Fatal in iteration 2+ — returns `bail` |
| `fix-gaps` | `fixGapsDetailed(unit, gaps)` | Calls strategy pipeline, surfaces `retryMode` + `strategyName` |
| `re-verify` | `findGaps(unit)` post-fix | Ground-truth gap count, `done` if 0 |
| `check-stall` | `hasStalled()` from helpers | Increments stall count, bails at 3 |
| `advance-attempt` | creates next numbered dir | Archives `wip/` for next attempt |

---

## 4. Convergence Loop (`unit/run.ts`)

The loop is now ~80 lines of setup + iteration:

```typescript
export async function run(unit: Unit): Promise<boolean> {
  // Pre-flight checks (WBS skip, output skip) — unchanged

  const tree = new PlaybookTree(DEFAULT_TREE, buildActionRegistry());
  let previousGaps: Gap[] = [];
  let stallCount = 0;

  for (let iteration = 1; iteration <= unit.config.maxIterations; iteration++) {
    const ctx: PlaybookContext = {
      unit, gaps: [], projectDir, epicId,
      iteration, previousGaps, stallCount, metadata: {},
    };

    const result = await tree.walk(ctx);

    // Read back mutated state from context
    previousGaps = ctx.previousGaps;
    stallCount = ctx.stallCount;

    if (result.action === 'done') return result.success ?? true;
    if (result.action === 'bail') return false;
    // 'continue' → next iteration
  }

  return false; // max iterations
}
```

### Data Flow

- **`PlaybookContext`** is mutable — action handlers update `ctx.gaps`, `ctx.stallCount`, `ctx.previousGaps`
- **`run.ts`** reads back mutated state after each `walk()` for cross-iteration persistence
- **`PlaybookTree`** is stateless — all state lives in the context

---

## 5. Gap Detection (`unit/find-gaps.ts`)

`findGaps(unit)` checks three categories in order. Plan and WBS gaps cause early returns — the task can't proceed without them.

```
findGaps(unit)
  │
  ├─ 1. Structural prerequisites (early return)
  │     ├─ plan.md missing?    → Gap { gapKind: 'plan' }
  │     └─ wbs.json missing?   → Gap { gapKind: 'wbs' }
  │
  ├─ 2. Input validation
  │     For each input declared in TASK.md frontmatter:
  │     ├─ glob pattern (has * ? {})
  │     │   └─ glob() → 0 matches? → Gap { gapKind: 'blocker' }
  │     └─ literal path
  │         └─ existsSync() → false? → Gap { gapKind: 'blocker' }
  │
  ├─ 3. Output validation
  │     For each output in TASK.md frontmatter:
  │     ├─ missing? → Gap { gapKind: 'output' }
  │     └─ exists but invalid?
  │         └─ validate (PNG/HTML/JSON) → Gap { gapKind: 'corrupted' }
  │
  └─ 4. Check validation
        For each check command in TASK.md:
        ├─ exit 0 → pass
        ├─ exit non-0 → Gap { gapKind: 'check-failed' }
        └─ exit 127 (cmd not found) → self-heal check, re-run
```

### Gap Metadata

Every gap carries metadata that strategies use for decisions:

```typescript
metadata: {
  gapKind:   'plan' | 'wbs' | 'blocker' | 'output' | 'check-failed' | 'corrupted',
  unitPath:  string,      // filesystem path to the unit
  taskId:    string,       // e.g. "001-lift-PageHeader"
  taskTitle: string,
  factId:    string,       // links to Facts API evidence
  // for blocker gaps:
  missingInputs?: string[],
  inputPattern?:  string,
}
```

---

## 6. Gap Resolution Dispatcher (`unit/fix-gaps.ts`)

`fixGaps(unit, gaps)` tries resolution methods in order. First match wins.

```
fixGaps(unit, gaps) → number of gaps resolved
  │
  ├─ 1. Plan gap?      → PlanExecutor
  ├─ 2. WBS gap?       → WbsExecutor
  ├─ 3. Executor fn?   → TaskExecutor + ConvergeController
  ├─ 4. Loop fn?       → LoopFunctionExecutor
  ├─ 5. Has children?  → recursive child.run()
  └─ 6. Leaf unit      → GapFixer (strategy pipeline)
         │
         ├─ Group gaps by task
         ├─ Pick representative gap (prefer gapKind: 'output')
         ├─ Call pipeline.resolve(gap)
         └─ Count resolved
```

---

## 7. Strategy Sub-Tree (`fix-gaps` action)

The `fix-gaps` action doesn't delegate to the pipeline's internal loop. Instead, it **builds a dynamic strategy sub-tree** and walks it with a sub-walker. Every strategy attempt is a tree node — visible, composable, and subject to the same fallthrough/select logic as the main tree.

### How It Works

```
fix-gaps action handler:
  │
  ├─ 1. Initialize pipeline registry (get eligible strategies)
  ├─ 2. Group gaps by taskId, pick representative gap per group
  ├─ 3. For each gap group:
  │     │
  │     Build dynamic sub-tree:
  │       fallthrough:
  │         ├─ action: fix-strategy-task-run        (always first, cheap)
  │         └─ select (AI diagnoses root cause):
  │              ├─ action: fix-strategy-dependency-backoff
  │              ├─ action: fix-strategy-missing-input-pattern
  │              ├─ action: fix-strategy-tool-environment-repair
  │              └─ action: fix-strategy-{skill-name}
  │     │
  │     Walk sub-tree with PlaybookTree.walk(ctx)
  │       ├─ fallthrough tries task-run first
  │       ├─ if task-run fails, select node asks AI to diagnose
  │       ├─ AI picks → walker walks that strategy node
  │       ├─ if it fails, fallthrough continues to next
  │       └─ first success → stops, surfaces retryMode
  │
  └─ 4. Surface results: ctx.lastResolution, PlaybookResult.retryMode
```

### Dynamic Action Handlers

Each strategy becomes a dynamically-registered action handler (`fix-strategy-{name}`). The handler:

1. Gathers context using the strategy's declared `contextSteps`
2. Calls `strategy.tryFix(gap, ctx)` for builtin strategies
3. Returns `PlaybookResult` with `resolved: 1` on success, `resolved: 0` on failure
4. On success, stores `Resolution` on `ctx.lastResolution`

The fallthrough node stops on first `resolved > 0`. The walker never sees the pipeline's internal retry loop — it IS the retry loop.

### Tree Node Ordering

| Position | Node Type | Strategy | Why |
|----------|-----------|----------|-----|
| 1st | action | task-run | Cheap retry, most gaps resolve on retry with FEEDBACK.md |
| 2nd | select | all other eligible | AI diagnoses root cause and picks strategy |

No strategy is auto-run (except task-run). The root cause of a gap is ambiguous — e.g. a missing input could be a wrong glob pattern in the task definition OR an upstream task that didn't produce its output. AI should decide.

### Strategy Selection

| Level | Filter | Purpose |
|-------|--------|---------|
| `gapKinds` (descriptor metadata) | Fast | Which strategies appear in the sub-tree |
| AI select node | Root cause diagnosis | Which strategy to try for this specific gap |

Example for a missing-input gap (`gapKind: 'blocker'`):

| Strategy | gapKinds match? | In select node? | When AI picks it |
|----------|-----------------|-----------------|------------------|
| `missing-input-pattern` | Yes (`blocker`) | Yes | Task definition has wrong glob pattern |
| `dependency-backoff` | Yes (`blocker`) | Yes | Upstream task didn't produce the file |
| `skill-based-repair` | Yes (`blocker`) | Yes | Other structural issue |
| `task-run` | No (`output`, `check-failed`) | Not in tree | Not eligible for blockers |

### How Results Surface

After the sub-tree walk completes:

- `ctx.lastResolution` — the full `Resolution` from the successful strategy (includes `retryMode`, `strategyName`, `metadata`)
- `PlaybookResult.retryMode` — propagated from the successful strategy
- `PlaybookResult.metadata.strategyName` — which strategy succeeded

Subsequent tree nodes (re-verify, check-stall) can branch on these values.

### Strategy Priority Table

```
Priority │ Strategy                          │ Handles          │ Method
─────────┼───────────────────────────────────┼──────────────────┼──────────────
  10     │ UserQuestionResumeStrategy         │ user-input       │ deterministic
  10     │ WBSGeneratorRepairStrategy         │ wbs bugs         │ AI (2 calls)
   9     │ DependencyBackoffStrategy          │ blocker/input    │ AI (1 call)
  8.5    │ MissingInputPatternRepairStrategy  │ blocker (glob)   │ deterministic
   8     │ ToolEnvironmentRepairStrategy      │ tool/env issues  │ AI (1 call)
   6     │ SkillBasedRepairStrategy           │ various          │ skill-driven
   5     │ TaskRunStrategy                    │ any (last resort)│ full re-exec
```

### Strategy Outcomes

Each strategy returns a `StrategyOutcome`:

```typescript
// Success — tell the convergence loop what to do next
{ success: true, reason: string, retryMode: RetryMode }

// RetryMode options:
'full'       // Full task re-execution (new attempt)
'validate'   // Just rerun validation checks
'none'       // No retry needed
'rerun'      // Re-execute the task
{ type: 'backoff', runFirst: string[], reason: string }
             // Run upstream tasks first, then retry

// Failure — pipeline tries next strategy
{ success: false, reason: string, shouldRetry: boolean }
```

---

## 8. Blocker Resolution (The Three Strategies)

When a task is blocked by missing inputs, three strategies attempt repair in order.

### 8a. MissingInputPatternRepairStrategy (priority 8.5)

**Guard:** Only handles gaps where `missingInputs` contains glob wildcards (`*`).

```
canHandle?
  └─ missingInputs has entries with '*'? → YES
  └─ Literal paths only?                → NO (skip)

tryFix:
  1. Extract glob patterns from missing inputs
  2. Generate pattern variations:
     - deeper:     designs/*.html  → designs/*/*.html
     - recursive:  designs/*.html  → designs/**/*.html
     - shallower:  designs/a/*.html → designs/*.html
  3. Test each variation with glob()
  4. First match → auto-fix TASK.md pattern → { retryMode: 'full' }
  5. No match → { success: false }
```

### 8b. DependencyBackoffStrategy (priority 9)

**Guard:** Handles all `gapKind: 'blocker'` or `'input'` gaps.

```
canHandle?
  └─ gapKind in (blocker, input) → YES

tryFix:
  1. Extract missing input paths from gap
  2. Generate DEPS.md via generateDepsMap()
  3. Ask AI for strategy decision
     AI chooses one of:
     ├─ "rerun-producer"  → re-run upstream task with LEARN.md
     ├─ "spawn-new-task"  → { success: false } (delegate)
     ├─ "fix-pattern"     → patch glob in TASK.md → { retryMode: 'full' }
     └─ "remove-input"    → remove stale input from TASK.md
  4. If rerun-producer:
     ├─ Find producer tasks (cross-epic search)
     ├─ Inject LEARN.md into producer's attempt dir
     └─ Return { retryMode: { type: 'backoff', runFirst: [...] } }
```

### 8c. IncompleteProducerOutputStrategy (priority 8)

**Guard:** Handles all `gapKind: 'blocker'` or `'input'` gaps.

```
canHandle?
  └─ gapKind in (blocker, input) → YES

tryFix:
  1. For each missing file, find a "sibling producer"
     (task that produces other files in the same directory)
  2. Found → patch producer's SKILL.md + inject LEARN.md
  3. Return { retryMode: { type: 'backoff', runFirst: [...] } }
  4. Not found → { success: false }
```

---

## 9. Design Decisions

### Why a tree instead of inline if/else?

| Before | After |
|--------|-------|
| Decision logic scattered across run.ts, fix-gaps.ts, pipeline.ts, unblock.ts | Single `DEFAULT_TREE` constant |
| Adding a repair path requires editing 3-5 files | Add an action handler + a tree node |
| `retryMode` lost at fix-gaps.ts boundary (returns `number`) | `PlaybookResult.retryMode` propagates back to run.ts |
| 455-line while loop in run.ts | ~80 lines delegating to tree |
| Blocker handling duplicated in 4 places | Single `resolve-blockers` handler |

### Key invariants

1. **Action handlers delegate, never replace.** They call the same `fixGaps()`, `executeInitial()`, `findGaps()` as before.
2. **The tree is a constant.** `DEFAULT_TREE` is a plain object — inspectable, serializable, overridable per-project.
3. **Context is mutable.** Action handlers mutate `ctx.gaps`, `ctx.stallCount`, etc. The walker is stateless.
4. **Existing strategies unchanged.** All strategy classes stay inside `GapResolutionPipeline.resolve()`, called by the `fix-gaps` action handler.

---

## 10. File Reference

| File | Role |
|------|------|
| `unit/run.ts` | Pre-flight checks + playbook convergence loop |
| `repair/playbook/types.ts` | `PlaybookNode` union, `PlaybookContext`, `PlaybookResult` |
| `repair/playbook/walker.ts` | `PlaybookTree.walk()` — recursive node evaluator |
| `repair/playbook/default-tree.ts` | `DEFAULT_TREE` — the data-driven decision structure |
| `repair/playbook/actions.ts` | `buildActionRegistry()` — 13 handlers wrapping existing code |
| `unit/find-gaps.ts` | Gap detection (inputs, outputs, checks) |
| `unit/fix-gaps.ts` | Gap dispatch (plan, wbs, executor, children, pipeline) |
| `repair/index.ts` | Pipeline factory + all exports |
| `repair/pipeline.ts` | `GapResolutionPipeline` — strategy orchestrator |
| `repair/types.ts` | `FixStrategy`, `StrategyOutcome`, `RetryMode`, `Resolution` |
| `repair/unified-strategy.ts` | AI-driven strategy selection |
| `gap/types.ts` | `Gap` interface, `CompactGap` |
