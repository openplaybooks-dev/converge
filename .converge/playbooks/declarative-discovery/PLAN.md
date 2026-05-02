# PLAN — declarative-discovery (root)

## Goal restatement

Replace the tree-based playbook execution model with a pure DAG. No iterations.
No waves. No folder-scan discovery. No next-task computation. Just a DAG:

- **Root** = the playbook
- **Nodes** = tasks (concrete or virtual)
- **Edges** = `children:`, `depends_on:`
- **Execution order** = topological sort
- **Dynamic tasks** = virtual nodes spawned from `from_seed:`

The result: a deterministic graph constructable from declarations alone, executed
in a single topological pass. The `task/tree/` directory and all tree concepts
are deleted. Hard cutover — no fallback.

## Decision

CONTAINER. Six children, ordered. Each gates the next on
`pnpm -r typecheck && pnpm -r test`.

## Pattern

**Lifecycle Pipeline.** DAG primitives → declarative loader → DAG runner
→ per-playbook migration → CLI consumer migration → strip tree abstractions.
Each phase produces a qualitatively different result; each gates the next.

## Why these phases

- **`01-dag-data-model`** — `DagNode`, `TaskDag`, `topological-sort` land.
  TASK.md frontmatter accepts `children:` and `from_seed:`. Schema-only —
  no loader or runner changes yet.
- **`02-declarative-loader`** — BFS walker from playbook.yml roots through
  `children:` declarations. Cross-loader parity. Virtual nodes for
  `from_seed:`.
- **`03-dag-runner`** — `executeDag()` — single topological pass. No
  iteration loop. No wave loop. Dynamic spawns materialize virtual nodes.
- **`04-migrate-playbooks`** — Every live playbook gets `children:`
  declarations. Gates the cutover — every playbook is declarative before
  tree code is deleted.
- **`05-migrate-cli-consumers`** — Replace TaskTree with TaskDag in every
  CLI command. Tree code unreferenced by end of phase.
- **`06-strip-tree`** — Delete `task/tree/`, `children.ts`, `tree-utils.ts`.
  Remove `Unit.parent`/`Unit.children`. Hard cutover. No fallback. No env flag.

## Children

| id | kind | goal | gating output |
|---|---|---|---|
| `01-dag-data-model` | container (6 sub-tasks) | DagNode, TaskDag, topological-sort land; TASK.md parses `children:` and `from_seed:`; design doc + REFS exist | `tsc --noEmit` passes; unit tests for topological sort (linear, diamond, cycle) green; TASK.md parses new fields |
| `02-declarative-loader` | container (3 sub-tasks) | BFS loader walks declarations only; path registry; cross-loader parity test green | `loader-parity.test.ts` passes; cycle detection produces clear errors |
| `03-dag-runner` | container (3 sub-tasks) | `executeDag()` runs topological pass; dynamic spawns materialize virtual nodes | Linear, diamond DAGs execute in correct order; spawned nodes appear mid-execution |
| `04-migrate-playbooks` | container (3 sub-tasks) | Every live playbook has `children:` on every parent | Per-playbook parity test green |
| `05-migrate-cli-consumers` | container (8 sub-tasks) | All CLI commands use TaskDag; TaskTree unreferenced | All commands functional; `pnpm -r test` green |
| `06-strip-tree` | container (7 sub-tasks, inverted red-green) | `task/tree/` deleted; `children.ts` deleted; `tree-utils.ts` deleted; `Unit.parent`/`children` removed | Tombstone test green; zero imports from `task/tree/` |

## TDD discipline

**Strict red-green-refactor at every leaf.** Each leaf task body says, in
this order:

1. Write a failing test that captures the contract (the leaf's `outputs:`
   and `checks:`).
2. Run it — must be RED.
3. Implement until GREEN.
4. Refactor while GREEN.

**For additions** (phases 01-03): `01-red` writes failing tests for code
that doesn't exist yet. `02-green` implements until tests pass, then
refactors.

**For migrations** (phases 04-05): `01-red` captures current behavior as
baseline tests. `02-green` swaps to DAG code path while keeping tests green.

**For deletions** (phase 06): **Inverted red-green.** `01-red` writes a
test asserting the thing does NOT exist — RED because it still does.
`02-green` deletes the thing — GREEN.

**Single-leaf tasks** (design doc, REFS catalog, user guide): no red/green
needed — these are documentation outputs.

Mechanically enforced via checks on every leaf:
- `vitest run <test-glob>` exits 0 (green).
- `pnpm -r typecheck` exits 0.

## Key design decisions

### Pure DAG — no iterations, no waves

The convergence loop (iterate until no more tasks, evaluate gaps, plan,
execute, repeat) is replaced by a single topological pass. `executeDag()`
runs layers in order, each node once. If a node fails, downstream blocked
nodes are skipped. That's it.

### Virtual nodes for dynamic tasks

Tasks declared via `from_seed:` become virtual `DagNode`s (`.virtual = true`).
They exist in the DAG — they participate in topological sort, they have
edges — but they have no TASK.md on disk. When their parent completes and
the seed spawner runs, the virtual node is replaced with a concrete one.

### No fallback, no env flag

Phase 06 deletes the tree abstractions entirely. Any consumer not migrated
by phase 05 will fail to compile. There is no `CONVERGE_DECLARATIVE_DISCOVERY`
flag — the DAG is the only path.

### Manifest IS the DAG

`TaskDag.toManifest()` serializes to the existing manifest format
(`parent_map`, `child_map`). `TaskDag.fromManifest()` reconstructs.
The manifest on disk is the serialized DAG.

## Sequencing rationale

1. **DAG primitives before loader.** The loader returns a `TaskDag`.
2. **Loader before runner.** The runner consumes the loader's DAG.
3. **Runner before migration.** Runner must work before migrating playbooks.
4. **Migrate playbooks before CLI consumers.** CLI reads playbooks.
5. **Migrate CLI consumers before stripping tree.** Can't delete tree while
   anything imports it.
6. **Strict linear depends_on.** Simple chain.

## Critical files

Created:
- `packages/core/src/dag/dag-node.ts` (phase 01)
- `packages/core/src/dag/topological-sort.ts` (phase 01)
- `packages/core/src/dag/task-dag.ts` (phase 01)
- `packages/core/src/dag/dag-runner.ts` (phase 03)
- `packages/core/src/dag/index.ts` (phase 01)
- `packages/core/src/config/declarative-loader.ts` (phase 02)
- `packages/core/src/config/path-registry.ts` (phase 02)
- `packages/core/tests/dag/topological-sort.test.ts` (phase 01)
- `packages/core/tests/dag/task-dag.test.ts` (phase 01)
- `packages/core/tests/dag/dag-runner.test.ts` (phase 03)
- `packages/core/tests/config/loader-parity.test.ts` (phase 02)
- `packages/core/tests/no-tree-abstractions.test.ts` (phase 06, tombstone)
- `docs/design/declarative-discovery.md` (phase 01)
- `docs/guides/declarative-tasks.md` (phase 06)

Modified:
- `packages/core/src/config/task-definition.ts` — add `children:`, `from_seed:` (phase 01)
- `packages/core/src/config/task-md-definition.ts` — parse new fields (phase 01)
- `packages/core/src/task/unit/unit.ts` — later remove `parent`, `children` (phase 06)
- `packages/core/src/index.ts` — replace tree exports with DAG exports (phase 06)
- Every live playbook's parent TASK.md files — `children:` added (phase 04)
- Every CLI consumer — TaskTree → TaskDag (phase 05)

Deleted (phase 06):
- `packages/core/src/task/tree/` — entire directory
- `packages/core/src/task/unit/children.ts`
- `packages/core/src/checkpoint/tree-utils.ts`
- `Unit.parent: Unit | null` and `Unit.children?: Unit[]`

## Pointers

- Predecessor playbooks: `.converge/journal/cli-redesign/`,
  `.converge/playbooks/remove-goals/`, `.converge/playbooks/dbt-paradigm/`.
- Current tree abstractions: `packages/core/src/task/tree/`,
  `packages/core/src/task/unit/children.ts`,
  `packages/core/src/checkpoint/tree-utils.ts`.
- Current loader: `packages/core/src/config/loader.ts`.
- dbt-paradigm child synthesizer (integration point):
  `packages/core/src/runtime/child-synthesizer.ts`.
