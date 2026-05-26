---
rfc: 0046
title: Partition inventory by run-resolved key
status: draft
type: feat
source: human
priority_tier: tier1
estimate: "3-4 days"
backwards_compatible: yes
risk: medium
breaks_existing: no
---
# RFC 0046: Partition inventory by run-resolved key

## Problem

A daily data-pipeline playbook produces outputs keyed by date (e.g. `episodes/2026-05-26/`). Today, every run writes into the same inventory at `.converge/inventory/{playbook}/tasks.jsonl`. When the pipeline runs again the next day, the coordinator sees yesterday's `done` tasks, applies the cache predicate (fingerprint match + outputs exist), and skips them. The new day's work never starts because the inventory remembers the old run.

The operator's options today:

1. **`converge clean --all --yes`** before each run — destroys all prior state, losing resumability within the same day.
2. **Embed the date in task IDs** — forces the playbook author to template every task name; spawned children accumulate unboundedly in a single inventory file.
3. **Use the `key:` input** to create a new epicId per value — changes the journal path but does NOT change the inventory path; the inventory is always `inventory/{playbook}/tasks.jsonl` regardless of key value (confirmed at `packages/core/src/journal/structure.ts:303-308`).

None of these are satisfactory. The framework needs a first-class concept of "partition": a run-resolved key that routes inventory reads and writes to a separate directory per key value, while leaving the journal, playbook source, and DAG compilation unchanged.

The conceptual-design example has a similar need: running with `--var design_system=stripe` vs `--var design_system=notion` should produce independent inventories, because each design system is an independent body of work that should be independently resumable.

## Current state

**Inventory directory resolution** (`packages/core/src/journal/structure.ts:303-308`):

```typescript
export function getInventoryDir(projectDir: string): string {
  const override = process.env.CONVERGE_INVENTORY_DIR;
  if (override) return override;
  const name = getPlaybookContextFromEnv()?.playbook ?? "default";
  return join(projectDir, ".converge", "inventory", name);
}
```

There is no partition concept. The directory is `{project}/.converge/inventory/{playbook}/` — one directory per playbook name, period.

**Playbook scope setup** (`packages/core/src/journal/structure.ts:314-319`):

```typescript
export function setPlaybookScope(playbookName: string, projectDir: string): void {
  process.env.CONVERGE_PLAYBOOK = playbookName;
  process.env.CONVERGE_PLAYBOOK_DIR = join(
    projectDir, ".converge", "playbooks", playbookName,
  );
  process.env.CONVERGE_WORKSPACE = projectDir;
}
```

No partition key is set. No `CONVERGE_PARTITION_KEY` exists.

**PlaybookDef schema** (`packages/core/src/task/playbook/types.ts:39-76`): The `PlaybookDef` interface has no `partitionBy` field.

**Compile hardcodes inventory path** (`packages/core/src/run/playbook-compile.ts:20`):

```typescript
const inventoryDir = join(projectDir, ".converge", "inventory", playbookName);
```

This bypasses `getInventoryDir()` entirely, so even setting `CONVERGE_INVENTORY_DIR` would not affect compilation.

**Task environment** (`packages/core/src/run/task-env.ts:24-83`): `buildTaskEnv` passes through `CONVERGE_VAR_*` variables but has no awareness of a partition key.

## Proposal

### 1. `partitionBy` in `playbook.yml`

Add an optional `partitionBy` field to the playbook config:

```yaml
# data-pipeline: partition by date
name: default
description: Daily AI-news podcast pipeline
partitionBy:
  cmd: "date +%Y-%m-%d"
run:
  maxTaskAttempts: 3
```

```yaml
# conceptual-design: partition by input variable
name: concept-living-playbook
partitionBy:
  param: design_system
inputs:
  design_system:
    default: "random"
    description: Design system name
```

Exactly one of `cmd:` or `param:` must be present. Both yield a string partition key.

- **`cmd:`** — a shell command executed once at run start. Its stdout (trimmed, single line) becomes the partition key. Useful for temporal partitions (`date +%Y-%m-%d`), git-derived partitions (`git rev-parse --short HEAD`), or any dynamic value.
- **`param:`** — the name of an input variable from the `inputs:` block (or a `--var` override). The resolved value of that variable becomes the partition key. Useful for parameterized runs where the variable already distinguishes the work.

### 2. `CONVERGE_PARTITION_KEY` environment variable

Once the partition key is resolved, it is exported as `CONVERGE_PARTITION_KEY` in the process environment. Every task body, check command, and hook can read it. This follows the existing `CONVERGE_VAR_*` pattern but is a single well-known key (not a dynamic prefix) because it is framework infrastructure, not user data.

### 3. Partitioned inventory directory

When a partition key is active, the inventory resolves to:

```
{project}/.converge/inventory/{playbook}/partitions/{key}/
```

instead of:

```
{project}/.converge/inventory/{playbook}/
```

The `tasks.jsonl` inside the partitioned directory is structurally identical — same row schema, same UPSERT logic, same file-lock protocol. No schema changes to `RuntimeTask`.

When no `partitionBy` is configured (or the key resolves to empty string), the current path is used unchanged. Full backwards compatibility.

**Directory tree example (data-pipeline, two daily runs):**

```
.converge/
  inventory/
    default/
      partitions/
        2026-05-25/
          tasks.jsonl      # yesterday's completed run
          goals.jsonl
        2026-05-26/
          tasks.jsonl      # today's fresh run (resumable within the day)
          goals.jsonl
  journal/
    default/               # unchanged — journal is NOT partitioned
      runstate.json
      events.jsonl
      tasks/...
  playbooks/
    default/
      playbook.yml         # has partitionBy: cmd: "date +%Y-%m-%d"
      tasks/...
```

### 4. Journal unchanged

The journal stays at `.converge/journal/{playbook}/` regardless of partition. The journal is execution forensics (logs, attempts, events). It is machine-local and already not committed to git. Partitioning the journal would fragment log streams and complicate `converge inspect`/`converge tail` for no benefit. The journal's `runstate.json` already gets rebuilt from inventory on cross-machine resume (RFC 0025).

When a new partition starts, the journal's `runstate.json` from the prior partition is stale. The existing `hydrateFromInventory()` path (RFC 0025) handles this cleanly — it reads the current partition's `tasks.jsonl`, finds no `done` rows, and starts fresh. Within the same partition, resume works normally.

### 5. No mixed partitions

A run resolves its partition key once at startup. The entire run uses that key. There is no mechanism to switch partitions mid-run.

If two terminals try to run the same playbook with different partition keys, the existing run-lock (`acquireRunLock`) prevents concurrent runs of the same playbook. No new lock is needed.

### 6. Resolution protocol

At the top of `run()`, before `setPlaybookScope`:

1. Read `playbook.def.partitionBy` from the parsed `PlaybookDef`.
2. If absent, skip — no partition. Current behavior.
3. If `cmd:`, execute the command synchronously via `child_process.execSync` with a 10-second timeout. Trim the stdout. Validate: must be a non-empty string matching `/^[a-zA-Z0-9._-]+$/` (safe for filesystem paths). Reject with a clear error if empty or contains unsafe characters.
4. If `param:`, look up the named variable in the resolved `vars` record. Validate same pattern.
5. If `--partition <key>` CLI flag is provided, it overrides both `cmd:` and `param:` resolution.
6. Set `process.env.CONVERGE_PARTITION_KEY = key`.
7. Set `process.env.CONVERGE_INVENTORY_DIR` to the partitioned path (this leverages the existing `CONVERGE_INVENTORY_DIR` override in `getInventoryDir`, requiring zero changes to `getInventoryDir` itself).
8. Ensure the directory exists (`mkdirSync(..., { recursive: true })`).
9. Emit a reporter event: `kind: "log", level: "info", message: "Partition key: {key}"`.

### 7. CLI surface

**`--partition <key>` on `converge run`**: explicit override. Takes precedence over `partitionBy.cmd` and `partitionBy.param`. Useful for replaying a specific partition or for CI where the partition key comes from the environment.

**`converge partitions list [playbook]`**: lists partition directories under `inventory/{playbook}/partitions/`, sorted by name. Shows task counts per partition.

**`converge partitions inspect <key> [playbook]`**: shows the task status summary for a specific partition. Reuses the existing status renderer, pointed at the partitioned inventory directory.

**`converge partitions clean <key> [playbook]`**: removes a partition's inventory directory. Useful for pruning old daily partitions.

## Migration

None required. The feature is purely additive:

- Playbooks without `partitionBy` are unaffected. `getInventoryDir` returns the same path as before.
- The `partitions/` subdirectory does not exist today and will only be created when `partitionBy` is configured.
- No existing env vars are modified. `CONVERGE_PARTITION_KEY` is new.
- The `RuntimeTask` row schema is unchanged.
- The journal layout is unchanged.

## Implementation steps

1. **Extend `PlaybookDef` with `partitionBy` and parse it from YAML.**
   - `packages/core/src/task/playbook/types.ts` — add `partitionBy?: { cmd?: string; param?: string }` to `PlaybookDef`.
   - `packages/core/src/task/playbook/loader.ts` — add parse + validation logic. Exactly one of `cmd`/`param` must be set; if `param`, the named variable must exist in `inputs`.

2. **Implement partition key resolution.**
   - `packages/core/src/run/partition.ts` (new) — export `resolvePartitionKey(def, vars, cliOverride?)`. Handles `cmd:` execution via `execSync`, `param:` lookup, CLI override, and key validation (`/^[a-zA-Z0-9._-]+$/`).

3. **Wire partition scope into structure helpers.**
   - `packages/core/src/journal/structure.ts` — add `setPartitionScope(key, projectDir, playbookName)` that sets `CONVERGE_PARTITION_KEY` and `CONVERGE_INVENTORY_DIR`. Add `clearPartitionScope()` that deletes both. Update `clearPlaybookScope()` to also call `clearPartitionScope()`.

4. **Integrate into CLI run command.**
   - `packages/cli/src/main.ts` — after resolving the playbook and vars, call `resolvePartitionKey()`. If non-null, call `setPartitionScope()` and `mkdirSync` the partition directory. Add `--partition` CLI option.

5. **Fix `compilePlaybook` hardcoded inventory path.**
   - `packages/core/src/run/playbook-compile.ts:20` — replace `join(projectDir, ".converge", "inventory", playbookName)` with `getInventoryDir(projectDir)`.

6. **Expose `CONVERGE_PARTITION_KEY` in task environment.**
   - `packages/core/src/run/task-env.ts` — in `buildTaskEnv`, propagate `CONVERGE_PARTITION_KEY` from `process.env` into the task env (it is already in `baseEnv` via the process environment, but ensure it is not stripped).

7. **Add CLI subcommands for partition management.**
   - `packages/cli/src/commands-partitions.ts` (new) — implement `list`, `inspect`, `clean`. Register in `packages/cli/src/main.ts`.

8. **Serialization roundtrip.**
   - `packages/core/src/playbook.ts` — in `buildPlaybookYaml`, emit `partitionBy:` when present.

## Test plan

1. **Unit: resolvePartitionKey with cmd** — mock `execSync` returning `"2026-05-26\n"`. Assert key is `"2026-05-26"` (trimmed).
2. **Unit: resolvePartitionKey with param** — vars `{ design_system: "stripe" }`, `partitionBy: { param: "design_system" }`. Assert key is `"stripe"`.
3. **Unit: resolvePartitionKey with CLI override** — `partitionBy: { cmd: "date..." }` but `cliOverride: "manual-key"`. Assert key is `"manual-key"`.
4. **Unit: resolvePartitionKey rejects unsafe characters** — key containing `/`, `..`, or spaces is rejected with an error.
5. **Unit: resolvePartitionKey with missing param** — param references a variable not in `vars`. Assert error with clear message.
6. **Unit: setPartitionScope routes getInventoryDir** — after `setPartitionScope("2026-05-26", dir, "default")`, `getInventoryDir(dir)` returns `{dir}/.converge/inventory/default/partitions/2026-05-26`.
7. **Unit: no partitionBy = current behavior** — `getInventoryDir` returns `{dir}/.converge/inventory/default` when no env override is set.
8. **Integration: data-pipeline with daily partition** — run data-pipeline with `partitionBy: cmd: "echo test-day"`. Assert inventory at `inventory/default/partitions/test-day/tasks.jsonl`. Run again — all tasks cached. Change cmd to `echo test-day-2` — new partition, all tasks pending.
9. **Integration: resume within partition** — start a run, kill mid-execution, resume. Assert tasks pick up from the same partition's inventory.
10. **Integration: CONVERGE_PARTITION_KEY visible in task** — add a check command `test "$CONVERGE_PARTITION_KEY" = "test-day"`. Assert it passes.
11. **CLI: partitions list** — create two partition directories. Assert `converge partitions list` prints both with task counts.
12. **CLI: partitions clean** — create a partition, clean it, assert directory removed.
13. **Serialization roundtrip** — `definePlaybook` with `partitionBy`, write to folder, load from folder, assert `partitionBy` preserved.

## Composition with other RFCs

| RFC | Relationship |
|---|---|
| **0004 (partitioned journal)** | Different concept. 0004 partitions journal `events.jsonl` by date for query performance. This RFC partitions inventory by a user-defined key for run isolation. They compose without conflict. |
| **0025 (portable resume via inventory)** | Composes cleanly. `hydrateFromInventory()` reads `getInventoryDir(projectDir)`. Once `CONVERGE_INVENTORY_DIR` points to the partition, hydration reads the right inventory automatically. |
| **0031 (unified tasks.jsonl)** | Composes. The partitioned directory contains the same `tasks.jsonl` format. Static and spawned task rows work identically inside a partition. |
| **0042 (task body env injection)** | Composes. `CONVERGE_PARTITION_KEY` is set before task env construction; `CONVERGE_VAR_*` injection is orthogonal. |

## Out of scope

- **Cross-partition queries.** No "show me all tasks across all partitions" query. Operators can `cat .converge/inventory/default/partitions/*/tasks.jsonl` for ad-hoc views.
- **Partition retention policies.** No automatic cleanup of old partitions. Use `converge partitions clean` or filesystem tools. A `maxPartitions` or TTL config is a follow-up.
- **Partition-aware journal.** The journal stays per-playbook. Per-partition journals are a separate RFC if needed.
- **Multi-partition concurrent runs.** The existing run-lock prevents concurrent runs of the same playbook. Running different partitions concurrently would require per-partition locking and journal isolation.
- **Partition key in RuntimeTask rows.** The directory name is the source of truth. No metadata field is added to task rows.
