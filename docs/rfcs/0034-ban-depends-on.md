---
rfc: 0034
title: Ban depends_on; auto-chain tasks alphabetically within levels
status: done
type: refactor
source: human
priority_tier: tier1
estimate: "3-5 days"
backwards_compatible: no
risk: high
breaks_existing: yes
---
# RFC 0034: Ban depends_on; auto-chain tasks alphabetically within levels

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | Written and accepted |
| Tests (TDD) | **done** | 9/9 RFC 0034 tests + existing tests updated |
| Remove `depends_on` from `TaskDefinition` | **done** | Interface + builder method removed |
| Remove `depends_on` from `TaskMdShape` | **done** | Added as internal-only field with RFC 0034 comment |
| Remove `depends_on` from `TaskMdSpawnSpec` | **done** | Field removed |
| Remove `depends_on` from `parseTaskMdString` | **done** | No longer parsed from frontmatter |
| Remove `depends_on` from `serializeTaskMd` | **done** | No longer written to TASK.md |
| Remove `depends_on` from `LIST_KEYS` / `listValuedKeys` | **done** | Parser no longer treats as list field |
| Remove `depends_on` from `parseSpawns` | **done** | Spawn spec no longer carries deps |
| Auto-chain in `declarative-loader.ts` | **done** | `buildSiblingOrder` + alphabetical wiring |
| Auto-chain in `static-children.ts` | **done** | Sibling auto-chain + parent dep |
| Remove `depends_on-self-reference` rule | **done** | Deleted from syntax rules |
| Clean `apply.ts` spawn rendering | **done** | No longer writes `depends_on` to TASK.md |
| Clean `RawModeInput` | **done** | Removed `depends_on` field |
| Update affected tests | **done** | All config, unit, spawn/apply tests passing |
| `pnpm build` | **done** | TypeScript + DTS clean |
| Pre-existing failures (RFC 0025, patterns, spawner) | **skip** | Failing before this RFC |
| CLI commands | **skip** | No `depends_on` in CLI interfaces |
| Update examples TASK.md | **skip** | No `depends_on` found in examples |
| Remove tag-based deps from `task-dag.ts` | **defer** | Defensive only, not blocking |

## Problem

`depends_on` is a manual DAG-edge declaration in TASK.md frontmatter. Users must explicitly wire execution order:

```yaml
# tasks/02-design-system/TASK.md
---
depends_on:
  - 01-prepare-requirements
---
```

This creates several problems:

1. **Planning burden** — every task must enumerate its upstream dependencies. With hundreds of tasks this becomes combinatorial and error-prone.
2. **Drift surface** — `depends_on` in TASK.md, `depends_on` in the unified inventory (tasks.jsonl), and `depends_on` in spawn rows are three places the same edge can be declared. They can disagree.
3. **Redundant with naming convention** — tasks already use numeric prefixes (`01-`, `02-`, `03-`) that encode the desired order. The dependency information is duplicated.
4. **Tag dependencies add complexity** — `tag:design` dependencies require scanning all nodes, resolving at addNode time, and maintaining reverse edges. This is a source of subtle bugs.

The framework already sorts ready nodes alphabetically by ID in `getReady()` (task-dag.ts line 171). This plan eliminates manual dependency wiring entirely.

## Proposal

**Ban `depends_on` as a public API.** The framework auto-wires dependencies during DAG construction:

1. **Within each directory level**, tasks are sorted alphabetically by ID and chained: task[N] depends on task[N-1]. The first task has no siblings to wait for.
2. **Parent→child** relationships are preserved: a child task depends on its parent completing.
3. **Cross-level dependencies** (task A in level 1 depends on task B in level 2) are not supported. If you need this, restructure your directory hierarchy.

### Execution model

```
tasks/
  01-prepare/
    TASK.md        ← root (no deps)
    001-gather/
      TASK.md      ← depends on: 01-prepare (parent)
    002-analyze/
      TASK.md      ← depends on: 01-prepare (parent), 001-gather (sibling chain)
  02-design/
    TASK.md        ← depends on: 01-prepare (sibling chain at top level)
    001-wireframe/
      TASK.md      ← depends on: 02-design (parent)
  03-build/
    TASK.md        ← depends on: 02-design (sibling chain at top level)
```

At each level, the alphabetical sort of directory names determines execution order. Numeric prefixes (`01-`, `02-`, `03-`) are the recommended convention but any sortable ID works.

### Code changes

#### 1. Remove `depends_on` from public interfaces

**`packages/core/src/config/task-definition.ts`**
- Remove `depends_on?: string[]` from `TaskDefinition` interface
- Remove `.depends_on(deps: string[])` builder method

**`packages/core/src/config/task-md-definition.ts`**
- Remove `depends_on` from `TaskMdDef` interface
- Remove `depends_on` from `TaskMdSpawnSpec` interface
- Remove parsing of `depends_on` frontmatter field from `parseTaskMdString`
- Remove writing of `depends_on` from `taskMdToYaml`
- Remove from `listValuedKeys` and strict validation
- Remove `validateSpawnEntryDependsOn`

**`packages/core/src/task/playbook/types.ts`**
- Remove `depends_on?: string[]` from `PlaybookTask`
- Remove `depends_on?: string[]` from `PlaybookGoal`

**`packages/core/src/playbook.ts`**
- Remove `depends_on` serialization in `definePlaybook()`
- Remove `depends_on` from `writeTaskMd()` frontmatter output

#### 2. Remove `depends_on` from spawn/runtime APIs

**`packages/core/src/task/spawn/unified-spawn.ts`**
- Remove `depends_on` from spawn row type

**`packages/core/src/task/spawn/apply.ts`**
- Remove `depends_on` from spawn shape merging

**`packages/core/src/task/goal/runtime-ledger.ts`**
- Remove `depends_on?: string[]` from `RuntimeTask` interface

#### 3. Add auto-chaining to DAG builders

**`packages/core/src/config/declarative-loader.ts`** (legacy loader)

Add a helper function that auto-chains discovered tasks:

```typescript
function autoChainAtLevel(taskIds: string[]): string[] {
  const sorted = [...taskIds].sort((a, b) => a.localeCompare(b));
  const result: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    result.push(i === 0 ? '' : sorted[i - 1]);
  }
  return result;
}
```

- After discovering tasks from `tasks/` directory, auto-chain them
- Don't read `depends_on` from TASK.md frontmatter
- Remove cycle detection (alphabetical chain cannot cycle)

**`packages/core/src/config/declarative-loader-unified.ts`** (unified loader)
- Same auto-chaining logic for tasks from inventory
- Don't read `depends_on` from task rows

**`packages/core/src/task/discovery/static-children.ts`**
- Child tasks auto-depend on their parent (keep existing)
- Sibling children auto-chained alphabetically (new)
- Don't read/merge `depends_on` from TASK.md

**`packages/core/src/manifest/build-dag.ts`**
- Auto-chain tasks within each level

#### 4. Simplify internal DAG wiring

**`packages/core/src/dag/task-dag.ts`**
- Remove tag-based dependency resolution (`tag:xxx` parsing in `addNode`)
- Keep alphabetical sorting in `getReady()` (core mechanism)
- Simplify `_recomputeRoots()` — a node is a root if it has no `parents`

**`packages/core/src/dag/dag-node.ts`**
- Mark `depends_on` as `@internal`
- Clean up deprecated comments about `parents`/`children`

**`packages/core/src/dag/topological-sort.ts`**
- Keep as-is — it reads `depends_on` which is now auto-wired internally

#### 5. Update CLI

**`packages/cli/src/commands-build.ts`**, **`commands-compile.ts`**, **`commands-retry.ts`**, **`reconcile.ts`**, **`migrate-0031.ts`**
- Remove `depends_on` from CLI interfaces and serialization

#### 6. Remove validation rules

**`packages/core/src/validation/rules/format.ts`** — Remove `depends_on-is-array` rule
**`packages/core/src/validation/rules/project.ts`** — Remove `depends_on` validation
**`packages/core/src/validation/rules/syntax.ts`** — Remove `depends_on-self-reference` rule

#### 7. Update schema

**`packages/core/src/task/mode/schema.ts`**
- Remove `depends_on?: unknown` from `RawModeInput`

#### 8. Update manifest types

**`packages/core/src/manifest/types.ts`**
- Remove `depends_on` from `ManifestNode` interface
- Remove `depends_on` from `DagNodeMetadata` interface

### Migration path

`converge migrate --rfc=0034` per playbook:

1. Parse all TASK.md files in `tasks/` directory.
2. Remove `depends_on:` from frontmatter in all TASK.md files.
3. Validate: re-load the playbook with the new loader; DAG must produce the same execution order (alphabetical sort of IDs).

### Backwards compatibility

**Clean break.** Playbooks with `depends_on:` in TASK.md frontmatter will have the field silently ignored (loader strips it). The `converge migrate --rfc=0034` command removes it from files.

The `depends_on` builder method and all related interfaces are **deleted**, not deprecated.

## Verification

1. **Migrator parity** — for each example playbook:
   - Run `converge migrate --rfc=0034`.
   - Load the playbook with the new loader.
   - Verify execution order matches alphabetical sort of task IDs.

2. **No `depends_on` in TASK.md** — grep across all example TASK.md files; zero matches.

3. **Alphabetical execution** — run a multi-task playbook and verify tasks execute in ID order.

4. **Parent→child preserved** — verify child tasks wait for parent completion.

5. **Build + tests pass** — `pnpm build && pnpm test`.

## Impact

- **All examples** need migration — every TASK.md with `depends_on:` must be cleaned.
- **Framework playbooks** (`rfc-ideation`, `code-audit`, `rfc-shipping`) need `depends_on:` removed from their TASK.md files.
- **User playbooks** — any playbook using `depends_on:` will need to restructure to use numeric prefixes for ordering.

## Relationship to RFC 0032

RFC 0032 banned inline task definitions from playbook.yml, establishing the `tasks/` folder as the sole authoring surface. This RFC completes the simplification by removing manual dependency declarations from TASK.md frontmatter. Together:

- **Authoring** — tasks/ folder (TASK.md files, no `depends_on`)
- **Ordering** — alphabetical ID sort within each directory level
- **Runtime** — tasks.jsonl (one row per task, edges auto-wired)

## Anti-goals

- **NOT** supporting arbitrary cross-level dependencies. The directory hierarchy IS the dependency graph.
- **NOT** supporting tag-based dependencies. Tags remain for filtering/selection only.
- **NOT** keeping `depends_on` as a fallback. Clean break.
