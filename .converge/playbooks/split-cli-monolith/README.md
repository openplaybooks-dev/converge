# split-cli-monolith

One-off playbook that executes the 13-PR plan to modularize `packages/core/src/cli/` and extract four workspace packages.

## Architectural intent

After this split lands, the packages map to distinct **interface layers**:

| Package               | Role                                          | Consumers                                           |
| --------------------- | --------------------------------------------- | --------------------------------------------------- |
| `@converge/core`      | **Programmatic interface** — pure library     | `@converge/cli`, future web UI, swebench, tbench    |
| `@converge/cli`       | **CLI interface** — terminal-facing shell     | end users running `converge` in a terminal          |
| `@converge/display`   | Terminal/ANSI renderer                        | `@converge/cli` **only**                            |
| `@converge/journal`   | Persistence (checkpoint/session/storage)      | `@converge/core`, `@converge/scheduler`             |
| `@converge/scheduler` | Task-tree primitives                          | `@converge/core`                                    |
| `@converge/navigator` | AI-driven reactive engine — JIT-buffered node graph that drives plugged-in handlers/scenarios | `@converge/core` (repair loop); future agent flows  |

**Invariants** (reviewed in every PR from PR10 onward):

1. **`@converge/core` has no CLI leakage.** No `process.exit`, no `console.log`/stdout writes, no TTY checks, no argv parsing, no ANSI escapes. Errors are `throw`n; results are `return`ed. A future web UI imports `@converge/core` and wires its own I/O — it must not need to touch `@converge/cli`.
2. **`@converge/display` is never imported by `@converge/core`** or by `@converge/scheduler`/`@converge/journal`. It's a terminal renderer; a web UI supplies its own.
3. **`@converge/cli` is the only package allowed to combine them** — it reads from core, renders via display, and handles stdin/stdout/signals.
4. **`swebench` and `tbench` depend on `@converge/core` only.** If either needs a CLI behavior, the behavior was in the wrong place; expose it as a library function on core.

These invariants make the programmatic and CLI surfaces decouple-by-construction. Every Tier B PR's review phase checks for violations.

## Usage

```bash
# From repo root
converge run --playbook=split-cli-monolith
```

Runs once, processes all 13 PR tasks in order. Resume-safe — stops and restarts pick up where the last session ended.

## Scope

**Tier A — reorganize within `packages/core/src/` (PR1–PR9)**

| PR  | Change                                                                   |
| --- | ------------------------------------------------------------------------ |
| 1   | Add behavior-locking tests against current file paths                    |
| 2   | Move `cli/next-task.ts` → `src/tree/next-task.ts` (single-file)          |
| 3   | Split `src/tree/next-task.ts` into 5 files + barrel                      |
| 4   | Move `cli/autonomous-run.ts` → `src/orchestrator/autonomous.ts`          |
| 5   | Split `src/orchestrator/autonomous.ts` into 5 files + barrel             |
| 6   | Split `cli/commands.ts` into `cli/commands/{init,plugins,checkpoint,…}.ts` |
| 7   | Move `cli/{tree,inspect,progress}-*.ts` → `cli/display/`                 |
| 8   | Extract `cli/args/` and `cli/bootstrap/` out of `main.ts`                |
| 9   | Extract `cli/dispatch/*` handlers out of `main.ts` switch                |

**Tier B — extract workspace packages (PR10–PR13)**

| PR  | Package             | Source moved                                        |
| --- | ------------------- | --------------------------------------------------- |
| 10  | `@converge/display` | `packages/core/src/cli/display/*`                   |
| 11  | `@converge/journal` | `packages/core/src/{journal,checkpoint,storage}/*`  |
| 12  | `@converge/scheduler` | `packages/core/src/tree/next-task/*` + ensure-epic-checkpoints |
| 13  | `@converge/cli`     | `packages/core/src/cli/*` + bin removed from core   |

**Tier C — extract the AI-driven reactive navigator (PR14–PR16)**

| PR  | Change                                                                            |
| --- | --------------------------------------------------------------------------------- |
| 14  | Behavior-locking tests for `repair/navigator/*` (safety net)                      |
| 15  | Split navigator engine from repair-specific handlers inside core (`repair/actions/`) |
| 16  | Extract `@converge/navigator` — zero-dep reactive engine driving JIT-buffered nodes |

### About `@converge/navigator`

The navigator is the driver for AI-influenced reactive flows: a graph of handler nodes that are **buffered just-in-time** (never pre-seeded), selected by **predicate applicability** against a live snapshot, and advanced one iteration at a time. AI doesn't live inside the engine — it enters through the handlers that the consumer plugs in (repair strategies today; agent scenarios later). The engine is deterministic; the traversal shape is shaped by what AI-capable handlers choose to buffer next.

## Per-PR pipeline

Each PR task runs: **analyze → implement → review → quality**.

- **analyze** — read `spec`, inspect current code, write implementation plan
- **implement** — plan → todos → execute each todo → verify (typecheck + tests)
- **review** — diff vs. spec; `REJECTED` resets implement
- **quality** — final typecheck + test gate; CLI smoke check

## Structure

```
split-cli-monolith/
  playbook.yml          # mode: oneoff
  README.md
  TASK.md               # root task declaring the WBS
  wbs/
    index.js            # seeds 13 PR items (data-driven from PRS array)
    templates/item/     # per-PR pipeline template (analyze→implement→review→quality)
  tasks/                # runtime-stamped task tree lives here
```
