# PLAN — declarative-discovery (root)

## Goal restatement

Replace the tree-based playbook execution model with a DAG-based model
inspired by dbt. This goes beyond replacing folder-scan discovery — the
DAG **is** the primary data model end-to-end:

- DAG primitives (`DagNode`, `TaskDag`, topological sort) replace
  `Unit.parent`/`Unit.children` and the entire `task/tree/` directory.
- A declarative loader walks `children:` and `from_seed:` declarations
  from TASK.md frontmatter and builds the DAG.
- A DAG runner executes tasks in topological order, replacing the
  sequential `for (child of unit.children)` loop.
- Every live playbook gets `children:` declarations.
- Every CLI consumer switches from `TaskTree` to `TaskDag`.
- The `task/tree/` directory, `discoverChildren()`, and `tree-utils.ts`
  are deleted.

The result: a logical graph at any scale, deterministic and constructable
without filesystem walking, with dbt-style explicit edge declarations.

## Decision

CONTAINER. Six children, ordered. Each gates the next on
`pnpm -r typecheck && pnpm -r test`.

## Pattern (from converge-planning §3)

**Lifecycle Pipeline.** DAG primitives → declarative loader → DAG runner
→ per-playbook migration → CLI consumer migration → strip tree
abstractions. Each phase produces a qualitatively different result; each
gates the next.

## Why these phases (not others)

- **`01-dag-data-model`** — `packages/core/src/dag/` lands with
  `DagNode`, `TaskDag`, and `topological-sort`. TASK.md frontmatter
  accepts `children:` and `from_seed:`. Schema-only — no loader or
  runner changes yet. The design doc and REFS inventory are also
  produced here (legacy phase 01 content absorbed).
- **`02-declarative-loader`** — BFS walker from playbook.yml roots
  through `children:` declarations. Cross-loader parity test proves
  identical DAG to folder-scan. Cycle detection. Path registry.
- **`03-dag-runner`** — Topological executor via Kahn's algorithm.
  Replaces the `for (child of unit.children)` loop in `fix-gaps.ts`.
  WBS spawning adds nodes to the running DAG.
- **`04-migrate-playbooks`** — Every live playbook gets `children:`
  declarations. Per-playbook parity verified. This phase gates the
  cutover — every playbook is declarative before any tree code is
  deleted.
- **`05-migrate-cli-consumers`** — Replace `TaskTree` with `TaskDag`
  in every CLI command and core consumer. One commit per consumer.
  Both APIs coexist during this phase.
- **`06-strip-tree`** — Delete `task/tree/`, `children.ts`,
  `tree-utils.ts`. Remove `Unit.parent`/`Unit.children`. No fallback.

## Children

| id | kind | goal | gating output |
|---|---|---|---|
| `01-dag-data-model` | container | DAG primitives land; TASK.md schema accepts `children:` and `from_seed:`; design doc + REFS exist | `tsc --noEmit` passes; unit tests for topological sort (linear, diamond, cycle) green; TASK.md parses new fields |
| `02-declarative-loader` | container | BFS loader walks declarations only; path registry; cross-loader parity test green | `loader-parity.test.ts` passes; cycle detection produces clear errors |
| `03-dag-runner` | container | Topological executor replaces tree-based orchestration; DAG runner executes linear, diamond, and single-node DAGs | Integration test: `A→B→C` and `A→[B,C]→D` execute in correct order; failed blocking task stops downstream |
| `04-migrate-playbooks` | container (seed-spawned per playbook) | Every live playbook has `children:` on every parent | Per-playbook parity test green: same DAG under both loaders |
| `05-migrate-cli-consumers` | container | All CLI commands and core consumers use TaskDag; TaskTree still exists but is unreferenced | All commands functional; `pnpm -r test` green |
| `06-strip-tree` | container | `task/tree/` deleted; `children.ts` deleted; `tree-utils.ts` deleted; `Unit.parent`/`children` removed | Tombstone test green; zero imports from `task/tree/`; `discoverChildren` unreachable |

## Sequencing rationale

1. **DAG primitives before loader.** The loader returns a `TaskDag`, so
   the DAG types must exist first.
2. **Loader before runner.** The runner consumes the loader's DAG output.
3. **Runner before migration.** The runner must work end-to-end before
   migrating playbooks, so migration has a target to verify against.
4. **Migrate playbooks before CLI consumers.** CLI consumers read
   playbooks — the playbooks must be declarative first.
5. **Migrate CLI consumers before stripping tree.** Tree code can't be
   deleted while anything still imports it.
6. **Strict numeric depends_on.** Linear chain — no dance needed.

## Key design decisions

### DAG primitives (`packages/core/src/dag/`)

```ts
// DagNode — pure data, no execution logic
interface DagNode {
  id: string;
  parents: string[];       // incoming children: edges (who declares me)
  children: string[];      // outgoing children: edges (who I declare)
  depends_on: string[];    // execution dependencies
  depended_on_by: string[];// reverse deps (computed)
  taskDef: TaskDefinition; // the actual task config
  path: string;            // file path — metadata, not structure
  status: 'pending' | 'ready' | 'running' | 'complete' | 'failed';
}

// TaskDag — container
class TaskDag {
  nodes: Map<string, DagNode>;
  roots: DagNode[];
  getReady(): DagNode[];
  getDownstream(id: string): DagNode[];
  toManifest(): Manifest;
  addNode(node: DagNode): void; // for WBS spawns
}
```

### Children declaration syntax (hybrid)

```yaml
# Bare ID — path defaults to <parent-dir>/tasks/<id>/TASK.md
children:
  - 001-foo
  - 002-bar

# Explicit path override — child can live anywhere
children:
  - id: 003-shared
    path: ../_shared/some-task/TASK.md

# Dynamic — children come from a spawning seed (dbt-paradigm)
from_seed: per-token
```

A parent may have either `children:`, `from_seed:`, or both. Two parents
may reference the same child id (DAG, not tree).

### DAG runner (topological execution)

Kahn's algorithm. On each iteration: `dag.getReady()` returns nodes
whose `depends_on` are all complete. Each ready node runs its
convergence loop. When it completes, downstream nodes may become ready.
Sequential execution first; parallelism as future optimization.

### Hard cutover, no fallback

Phase 06 deletes the tree abstractions entirely. Any consumer not
migrated by phase 05 will fail to compile. Phase 04's catalog is
exhaustive and its parity tests gate the cutover.

## TDD discipline

Strict red-green-refactor at every leaf for additions. Inverted
red-green for deletions (phase 06).

Cross-loader parity is the primary gate: for every playbook, the
declarative loader and folder-scan loader must produce identical node
sets and edge sets.

Mechanically gated:
- `pnpm --filter @converge/core --filter @converge/cli typecheck` exits 0.
- `pnpm --filter @converge/core --filter @converge/cli test` exits 0.

## Coordination with predecessors

- **`cli-redesign`** — manifest format, `--select` grammar, `target/`
  directory all exist. Phase 01 here builds DAG types compatible with
  the existing manifest shape.
- **`remove-goals`** — legacy goal concept gone. Phase 06 doesn't touch
  goal code (already deleted).
- **`dbt-paradigm`** — seeds and tests exist; `child-synthesizer.ts`
  exists; WBS API is gone. Phase 01's `from_seed:` field is the
  declarative entry point for spawning seeds.

Phase 01's first task verifies all three predecessors via the
playbook-level `predecessor-*-merged` checks.

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
- `packages/core/tests/config/loader-parity.test.ts` (phase 02)
- `packages/core/tests/dag/dag-runner.test.ts` (phase 03)
- `packages/core/tests/no-tree-abstractions.test.ts` (phase 06, tombstone)
- `docs/design/declarative-discovery.md` (phase 01)
- `docs/guides/declarative-tasks.md` (phase 06)

Modified:
- `packages/core/src/config/task-definition.ts` — add `children:`, `from_seed:` (phase 01)
- `packages/core/src/config/task-md-definition.ts` — parse new fields (phase 01)
- `packages/core/src/task/unit/unit.ts` — add `parentIds`, `childIds`; later remove `parent`, `children` (phases 01, 06)
- `packages/core/src/task/unit/fix-gaps.ts` — DAG-aware codepath (phase 03)
- `packages/core/src/task/unit/run.ts` — DAG runner integration (phase 03)
- `packages/core/src/task/playbook/types.ts` — add `rootTaskIds` (phase 02)
- `packages/core/src/task/playbook/loader.ts` — populate `rootTaskIds` (phase 02)
- `packages/core/src/manifest/types.ts` — minor DAG edge additions (phase 01)
- Every live playbook's parent TASK.md files — `children:` added (phase 04)
- Every CLI consumer — TaskTree → TaskDag (phase 05)
- `packages/core/src/index.ts` — replace tree exports with DAG exports (phase 06)

Deleted (phase 06):
- `packages/core/src/task/tree/` — entire directory
- `packages/core/src/task/unit/children.ts` — folder-scan discovery
- `packages/core/src/checkpoint/tree-utils.ts` — tree-specific checkpoint utils
- `Unit.parent: Unit | null` and `Unit.children?: Unit[]` — tree fields

## Reuse callouts (do not reinvent)

- **Manifest format**: `cli-redesign` phase 01 lands it. TaskDag serializes
  to/from the existing manifest shape (`child_map`, `parent_map`).
- **Selectors**: `--select` grammar already addresses the DAG by id.
  No new selectors needed.
- **Child synthesizer**: `dbt-paradigm` phase 03 lands
  `packages/core/src/runtime/child-synthesizer.ts`. Phase 03 here uses
  it as the integration point for WBS spawns adding nodes to the DAG.
- **Checkpoint**: existing per-task checkpoint system works unchanged —
  the DAG runner marks tasks complete/failed the same way.
- **NavigatorGraph**: general-purpose graph already exists. The new
  TaskDag is playbook-level (task orchestration), not per-task
  (convergence loop). They serve different layers.

## Pointers

- Plan of record: `~/.claude/plans/floating-stirring-sunbeam.md`.
- Predecessor playbooks: `.converge/journal/cli-redesign/`,
  `.converge/playbooks/remove-goals/`, `.converge/playbooks/dbt-paradigm/`.
- Current tree abstractions: `packages/core/src/task/tree/`,
  `packages/core/src/task/unit/children.ts`,
  `packages/core/src/checkpoint/tree-utils.ts`.
- Current loader: `packages/core/src/config/loader.ts`.
- dbt-paradigm child synthesizer (integration point):
  `packages/core/src/runtime/child-synthesizer.ts`.
