# split-cli-monolith

One-off playbook that onion-splits `packages/core/src/` into 7 workspace packages over 18 PRs.

## Architectural intent

End-state dependency flow:

```
@converge/cli → @converge/engine → @converge/task → @converge/core
                    ↓                                      ↑
              @converge/navigator (zero-dep)               |
              @converge/journal ───────────────────────────┘
              @converge/scheduler → @converge/journal
              @converge/display (cli-only)
```

| Package               | Role                                                                    | Consumers                                         |
| --------------------- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| `@converge/cli`       | Outer shell — bin, argv, dispatch, I/O                                  | end users                                         |
| `@converge/engine`    | Middle layer — `autonomousRun`, orchestrator, repair actions, lifecycle, executor, planning, playbook loader, gap resolution, goal/evolve/converge runners, dispatch | cli, future web UI, swebench, tbench              |
| `@converge/task`      | Domain model — Unit class, TreeNode, TaskTree, path-utils, task-context. Defines what a task is and how tasks form trees. RunStrategy + TaskStateProvider injected by engine at runtime | engine, cli, scheduler                            |
| `@converge/core`      | Inner primitive — pure types/contracts (gap, goal types, config, hooks, functions, context, ai, validation, discovery, executor types for swebench/tbench) | task, engine, everyone else                       |
| `@converge/navigator` | Inner primitive — reactive JIT-buffered graph engine, zero-dep          | engine (repair loop); future agent flows          |
| `@converge/journal`   | Inner primitive — checkpoint + journal + storage + session logger       | engine, scheduler                                 |
| `@converge/scheduler` | Inner primitive — task-tree scheduling, next-task, ensure-epic-checkpoints | engine                                            |
| `@converge/display`   | Inner primitive — terminal/ANSI renderer, consumed **only** by cli       | cli                                               |

**Invariants enforced by playbook checks and the final PR14 ESLint gate:**

1. `@converge/core` never imports any other `@converge/*` package.
2. `@converge/task` depends only on `@converge/core` — no journal, scheduler, navigator, engine, cli, or display imports.
3. `@converge/{navigator,journal,scheduler,display}` never import each other, engine, or cli.
4. `@converge/engine` can import task + primitives but not cli or display.
5. `@converge/cli` is allowed to import everything below it.
6. `@converge/navigator` has zero runtime dependencies and zero filesystem/IO imports.
7. `@converge/core`, `@converge/task`, and `@converge/engine` have no CLI leakage (no `process.exit`, no stdout writes, no `console.*`, no ANSI escapes).

A future web UI imports `@converge/engine` (which pulls in `@converge/task`) and wires its own renderer — it never depends on `@converge/cli` or `@converge/display`. A simpler runner that doesn't need self-correction can import `@converge/task` directly for the Unit/TreeNode model without pulling in the full engine. The PR14 programmatic smoke test is the integration pattern.

### About `@converge/navigator`

The navigator is the **driver** for AI-influenced reactive flows: a graph of handler nodes that are **buffered just-in-time** (never pre-seeded), selected by **predicate applicability** against a live snapshot, and advanced one iteration at a time. AI doesn't live inside the engine — it enters through the handlers consumers plug in (repair strategies today; agent scenarios later). The engine is deterministic; the traversal shape is driven by what AI-capable handlers choose to buffer next.

## Usage

```bash
# From repo root
converge run --playbook=split-cli-monolith
```

Runs once; processes all 18 PR tasks in order. Resume-safe.

## PR sequence

**Phase 0 — Safety net**

| PR  | Task ID                 | Change                                                           |
| --- | ----------------------- | ---------------------------------------------------------------- |
| 1   | 001-behavior-tests      | Behavior-locking tests + recorded-trace test of `converge()`     |

**Phase 1 — Navigator upper-front**

| PR   | Task ID                      | Change                                                                             |
| ---- | ---------------------------- | ---------------------------------------------------------------------------------- |
| 2    | 002-split-navigator-actions  | Split engine from 1236-line `actions.ts`; introduce `EventSink` injection          |
| 3a   | 003-navigator-io-free        | Parameterize types; inject `getJournalStructure` callback; zero outside imports    |
| 3b   | 004-extract-navigator-pkg    | Extract `@converge/navigator` workspace package (zero-dep)                         |

**Phase 2 — In-core reorg**

| PR  | Task ID                          | Change                                                              |
| --- | -------------------------------- | ------------------------------------------------------------------- |
| 4   | 005-next-task-scheduler-shape    | `cli/next-task.ts` → `src/scheduler/` (direct to scheduler-ready shape) |
| 5   | 006-split-autonomous-run         | `cli/autonomous-run.ts` → `orchestrator/autonomous/` (split into 5 files) |
| 6   | 007-split-commands-main          | Extract `cli/args/`, `cli/bootstrap/`, `cli/dispatch/`; split `commands.ts` |
| 7   | 008-group-cli-display            | Group `cli/{tree,inspect,progress,show}*.ts` → `cli/display/`       |

**Phase 3 — Extract leaf primitives**

| PR  | Task ID                    | Change                                                                                                              |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 8   | 009-extract-display-pkg    | `@converge/display` (zero-dep, CLI-only)                                                                            |
| 9   | 010-extract-journal-pkg    | `@converge/journal` (rename `journal/navigator.ts` → `navigator-reader.ts` to avoid collision with `@converge/navigator`) |
| 10  | 011-extract-scheduler-pkg  | `@converge/scheduler` (directory-level `git mv` — clean thanks to PR4)                                              |

**Phase 4 — Engine middle layer**

| PR   | Task ID                        | Change                                                                  |
| ---- | ------------------------------ | ----------------------------------------------------------------------- |
| 11a  | 012-engine-leaf-dirs           | `executor`, `planning`, `playbook`, `dispatch`, etc. → engine (15 dirs; unit/tree deferred) |
| 11a′ | 012b-extract-task-pkg          | `@converge/task` — Unit, TreeNode, TaskTree, path-utils extracted with RunStrategy + TaskStateProvider injection |
| 11b  | 013-engine-orchestration-hubs  | `orchestrator`, `lifecycle`, `loop`, `converge`, `evolve`, `repair` (sans navigator), `plugins` → engine |
| 11c  | 014-rewire-engine-exports      | `@converge/engine/index.ts` with `autonomousRun`; core stops re-exporting engine symbols — HARD BREAK |
| 12   | 015-slim-core                  | `@converge/core` becomes pure types/contracts                           |

**Phase 5 — CLI outer shell**

| PR  | Task ID                  | Change                                                            |
| --- | ------------------------ | ----------------------------------------------------------------- |
| 13  | 016-extract-cli-pkg      | `@converge/cli` with the `converge` bin; bin removed from core    |

**Phase 6 — Audit**

| PR  | Task ID                 | Change                                                                                                         |
| --- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| 14  | 017-layering-audit      | ESLint `no-restricted-imports` enforcing onion direction; `madge --circular` in CI; programmatic smoke test proving future-web-UI integration works |

## Per-PR pipeline

Each of the 18 PR tasks runs: **analyze → implement → review → quality**.

- **analyze** — read spec, inspect current code, write implementation plan
- **implement** — plan → todos → execute each todo → verify (typecheck + tests)
- **review** — diff vs. spec; `REJECTED` resets implement
- **quality** — final typecheck + test gate; CLI smoke check; `madge --circular`

## Structure

```
split-cli-monolith/
  playbook.yml          # mode: oneoff, 6h max, with layering-invariant checks
  README.md             # this file
  TASK.md               # root task declaring the WBS
  wbs/
    index.js            # reads prs.json, spawns items from templates
    prs.json            # 18-PR data (id, title, tier/phase, summary, spec)
    templates/item/     # per-PR pipeline template (analyze→implement→review→quality)
  tasks/                # runtime-stamped task tree (153 TASK.md files at full depth)
```
