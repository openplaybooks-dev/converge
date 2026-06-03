---
rfc: 0031
title: Fold template + params + depends_on into the task row
status: draft
type: refactor
source: human
priority_tier: tier1
estimate: "4-5 days"
backwards_compatible: no
risk: medium
breaks_existing: yes
---
# RFC 0031: Fold template + params + depends_on into the task row

## Problem

After RFC 0024 (AI-native spawning) and RFC 0030 (single source of truth for spawned contracts), `mezon-bot-ai` materialises 133 `spawn.yml` files under `.converge/spawn/` — one per dynamically-spawned task in the `mezon-portal` pipeline. Each `spawn.yml` is three fields:

```yaml
# .converge/spawn/screen-landing-03-react/spawn.yml
template: screen-03-react
depends_on:
  - screen-landing-02-design
params:
  screenId: "landing"
  route: "/"
  title: "Landing"
  density: "workspace"
```

Each one has a 1:1 sibling row in `.converge/inventory/mezon-portal/tasks.jsonl` carrying the runtime state (status, fingerprint, completedAt). **Two writable surfaces describing the same N children → drift class** (RFC 0030's analysis, one layer up).

Meanwhile, static tasks are declared in `playbook.yml`'s `tasks:` block and have their own directory under `tasks/<id>/`. Spawned tasks reference `templates/<name>/`. Two discovery paths, two row schemas, two loader branches.

This RFC unifies them: **one file, one row schema, one discovery path.** `template`, `params`, and `depends_on` move from sidecar `spawn.yml` files into the task row itself. Static and spawned tasks share the same interface, distinguished only by `taskRef.kind`.

## Current behaviour

### Static tasks
- Declared in `playbook.yml`'s `tasks:` block
- Contract lives at `.converge/playbooks/<pb>/tasks/<id>/TASK.md`
- Runtime state in `.converge/inventory/<pb>/tasks.jsonl` (one row per task)
- Loader: `declarative-loader.ts` parses `playbook.yml`, walks `tasks/` directories

### Spawned tasks
- Declared via `spawn.yml` files under `.converge/spawn/<id>/`
- Contract template at `.converge/playbooks/<pb>/templates/<name>/TASK.md`
- Rendered contract at `.converge/journal/<pb>/tasks/<parent>/exec/spawn/<id>/EXPANDED.md` (RFC 0030)
- Runtime state in `.converge/inventory/<pb>/tasks.jsonl` (one row per child)
- Loader: `declarative-loader.ts` calls `discoverSpawnedChildren()` which walks `.converge/spawn/`, reads each `spawn.yml`, merges with runtime state

### The drift surface

For a playbook with N spawned children:
- N `spawn.yml` files under `.converge/spawn/<id>/`
- N rows in `tasks.jsonl`
- Two places to update when a child's dependencies change
- Two places to check when debugging "why didn't this child run?"
- Two parsers, two schemas, two validation paths

## Proposal

**One file. One row schema. One discovery path.**

### Row 1 — playbook header

Add a single `kind: "playbook"` row at the top of `.converge/inventory/<pb>/tasks.jsonl` carrying everything `playbook.yml` carries except the `tasks:` block:

```jsonl
{
  "kind": "playbook",
  "schemaVersion": 1,
  "name": "mezon-portal",
  "description": "Build the mezon-mentor-bot portal …",
  "inputs": { "portalDir": { "default": "apps/portal" } },
  "variables": { "designDoc": "DESIGN.md" },
  "run": { "maxTaskAttempts": 3, "resume": true, "workers": 1 },
  "skills": { "tailwind-v4-tokens": ".converge/playbooks/mezon-portal/skills/tailwind-v4-tokens/SKILL.md" },
  "checks": [{ "id": "typescript-valid", "cmd": "cd apps/portal && pnpm typecheck" }],
  "goals": [],
  "hooks": [],
  "createdAt": "2026-05-19T12:50:45.738Z",
  "updatedAt": "2026-05-21T01:02:25.887Z"
}
```

`playbook.yml` is deleted at migration time.

### Rows 2..N — unified task row (one interface, two flavours)

Single `RuntimeTask` shape grows by three fields: `template`, `params`, `depends_on` (the last already exists; the first two are new). `taskRef` distinguishes the two flavours:

**Static task** — references `tasks/<id>/`:
```jsonl
{
  "kind": "task",
  "id": "00-requirements",
  "taskRef": { "kind": "static", "dir": ".converge/playbooks/mezon-portal/tasks/00-requirements" },
  "depends_on": [],
  "status": "done",
  "source": "static",
  "fingerprint": "sha256:e49e7c62…",
  "completedAt": "2026-05-21T01:02:16.714Z",
  "createdAt": "2026-05-19T12:50:45.738Z",
  "updatedAt": "2026-05-21T01:02:25.887Z"
}
```

**Spawned task** — references `templates/<name>/` + params (replaces `spawn.yml`):
```jsonl
{
  "kind": "task",
  "id": "screen-landing-03-react",
  "taskRef": { "kind": "template", "name": "screen-03-react" },
  "params": { "screenId": "landing", "route": "/", "title": "Landing", "density": "workspace" },
  "depends_on": ["screen-landing-02-design"],
  "parent": "07-screens",
  "status": "todo",
  "source": "spawned",
  "createdAt": "2026-05-20T10:30:00.000Z",
  "updatedAt": "2026-05-20T10:30:00.000Z",
  "metadata": { "template": "screen-03-react", "renderedHash": "sha256:…" }
}
```

**Same parser. Same DAG-builder. Same code path.** The only branch is at contract-resolve time:
- `taskRef.kind === "static"` → read `<dir>/TASK.md`
- `taskRef.kind === "template"` → render `templates/<name>/TASK.md` with `params` into the `EXPANDED.md` path defined by RFC 0030

## What stays the same

- `templates/<name>/TASK.md` and `templates/<name>/PARAMS.yml` — unchanged. Templates remain directory-discovered; `PARAMS.yml` stays next to its `TASK.md` (it's a template contract, not playbook data).
- `tasks/<id>/TASK.md` for static tasks — unchanged.
- `EXPANDED.md` per RFC 0030 — unchanged; still the rendered contract for spawned tasks at `.converge/journal/<pb>/tasks/<id>/exec/spawn/<id>/EXPANDED.md`.
- Idempotency, fingerprinting, resume — all preserved.

## What goes away

- `.converge/playbooks/<pb>/playbook.yml`
- `.converge/spawn/<id>/spawn.yml` (all 133 of them in `mezon-bot-ai`)
- `.converge/spawn/` directory entirely
- `discoverSpawnedChildren()` walker in `declarative-loader.ts`
- `ingestSpawnDir` pipeline in `spawn/ingest.ts` / `discover.ts` / `expand.ts`

## Critical files to modify

### 1. `packages/core/src/task/goal/runtime-ledger.ts`
- Extend `RuntimeTask` with `kind`, `taskRef`, `params`
- Add `RuntimePlaybookHeader` interface
- New `readUnifiedTasksFile()` + `writeUnifiedTasksFile()`
- Mutate `appendTaskUpsert` to accept `taskRef` instead of `taskPath`

### 2. `packages/core/src/config/declarative-loader.ts`
- Delete YAML parsing of `playbook.yml` (lines 73-138)
- Delete `discoverSpawnedChildren` (lines 192-306)
- Replace with single-pass row reader; route per-row by `taskRef.kind` to resolve the contract

### 3. `packages/core/src/task/spawn/apply.ts`
- `applyManifest` narrows to: validate params against `PARAMS.yml` → render `EXPANDED.md` → call `appendTaskUpsert` with `taskRef: { kind: "template", name }` + `params`
- Delete the legacy `inventory/<pb>/spawned/<id>` write (lines 561-660; RFC 0030 already deprecated it)

### 4. `packages/core/src/task/spawn/{ingest,discover,expand,status,strays}.ts`
- Delete; functionality folds into `apply.ts` or becomes dead with the spawn directory

### 5. `packages/core/src/task/spawn/manifest.ts`
- `SpawnRowSchema` survives as the internal IR consumed by `converge task add --batch`
- No external authoring surface

### 6. `packages/core/src/run/index.ts`
- `compilePlaybook` (line 2105) replaces the `hasPlaybookYml` dispatch with `readUnifiedTasksFile()`
- `hashPlaybook` (line 2241) updates inputs: row-1 header + static `TASK.md` contents + template `TASK.md` + `PARAMS.yml`. No more `spawn.yml` in the hash set.

### 7. `packages/core/src/task/playbook/types.ts`
- Add `RuntimePlaybookHeader` mirroring `PlaybookDef` minus `tasks`
- `PlaybookDef` becomes a derived view (populated from row 1 + rows 2..N) rather than an authored interface

### 8. `packages/cli/src/commands-migrate.ts` (new or extend)
- `converge migrate --rfc=0031` per playbook: read `playbook.yml` + walk `.converge/spawn/*/spawn.yml` + merge runtime state from existing `tasks.jsonl` → write unified `tasks.jsonl` → move legacy files to `.converge/_archive/rfc-0031/<timestamp>/`
- Idempotent (no-op when row 1 is already `kind: "playbook"`)

## How spawning works after this RFC

A spawner-mode task body no longer writes `spawn/<id>/spawn.yml` files. It appends task rows directly via:

```bash
converge task add \
  --id screen-landing-03-react \
  --template screen-03-react \
  --depends-on screen-landing-02-design \
  --param screenId=landing --param route=/ --param title=Landing --param density=workspace
```

Or in bulk:

```bash
converge task add --batch <<'EOF'
{ "id": "screen-landing-03-react", "taskRef": { "kind": "template", "name": "screen-03-react" }, "params": {...}, "depends_on": ["screen-landing-02-design"] }
{ "id": "screen-bots-list-03-react", "taskRef": { "kind": "template", "name": "screen-03-react" }, "params": {...}, "depends_on": ["screen-bots-list-02-design"] }
EOF
```

Per-row validation runs against the template's `PARAMS.yml` at append time; failures print `errorCode` + `fix:` lines to stdout (replaces RFC 0024's `STATUS.md`). `EXPANDED.md` is rendered on append; the runner reads `EXPANDED.md` (RFC 0030's invariant preserved).

## Migration path

`converge migrate --rfc=0031` per playbook:

1. Parse `playbook.yml` → row 1.
2. Walk `.converge/spawn/*/spawn.yml` → spawned-task rows; merge runtime state by id from existing `tasks.jsonl`.
3. Walk `tasks/*/TASK.md` (entries in `playbook.yml`'s `tasks:` block or auto-discovered) → static-task rows; merge runtime state by id.
4. Atomically write the unified `tasks.jsonl`: header, then static rows in declaration order, then spawned rows sorted by parent + id.
5. Move `playbook.yml` and `.converge/spawn/` to `.converge/_archive/rfc-0031/<timestamp>/`.
6. Validate: legacy-loader DAG vs. new-loader DAG must have identical node sets, identical edges, identical `taskDef` per node. Emit `MIGRATION_REPORT.md` on any delta.

**Mezon-bot-ai concretely:** 4 playbooks; `mezon-portal`'s 64 static rows + 133 `spawn.yml` files → ~200-row unified `tasks.jsonl`, zero `spawn/` directory, zero `playbook.yml`.

**No silent dual-format support.** A workspace with both `playbook.yml` and a unified header row is rejected with a pointer to the migrator. The legacy reader lives for one minor release; removed in v2.0.

## Relationship to prior RFCs

| RFC | Relationship |
|---|---|
| **0021** | Authoring surface (`spawn.plan.jsonl`) superseded; engine preserved as internal IR. |
| **0024** | Authoring surface (`spawn.yml`) superseded; "AI invokes templates, doesn't author contracts" principle preserved (invocation primitive changes from file to row). |
| **0025** | Extended; row grows by `taskRef` + `params` + `kind`. Cross-machine resume strengthened (peer can re-render contract from the row alone). |
| **0030** | Extended; `EXPANDED.md` remains the rendered-contract artefact. Triggering write moves from `ingestSpawnDir` to `appendTaskUpsert`. |

## Open questions

1. **Per-row CLI vs. bulk JSONL as the AI's append surface.** Lean: ship both; default to per-row for ≤10 children, batch for >10.
2. **PR diff legibility at 1000 rows.** Mitigation: deterministic row ordering (parent then children, alpha by id) + a `converge tasks fmt` command. Custom git diff driver is a follow-up.
3. **Streaming reads for huge files.** `readTaskRows` slurps the whole file today. Tractable to ~5K rows; revisit partitioning (RFC 0004 territory) only when a real playbook crosses that line.
4. **`converge add` ergonomics.** Today it materialises a `TASK.md` under `tasks/<id>/`. Post-RFC it must also append a static-task row. Single command with both effects; `--no-row` escape hatch for template authoring.

## Verification

1. **Migrator parity per example.** For each playbook under `examples/`, the legacy loader against the old layout and the new loader against the new layout must produce DAGs with identical node sets, identical edges, and identical per-node `taskDef` (modulo whitespace).
2. **Mezon-bot-ai end-to-end.** Migrate all 4 playbooks. Run `converge run mezon-portal --dry`. Expect identical task plan to pre-migration, zero `spawn.yml` on disk, one `tasks.jsonl` per playbook.
3. **Cross-machine resume.** Pre/post: machine A runs to N done, pushes `inventory/`; machine B (fresh `journal/`) skips N tasks. Same behaviour either side of the migration.
4. **Spawn-storm throughput.** 600-row playbook appended via `converge task add --batch` lands in <2s, matching the today-baseline of 600 `spawn.yml` writes + 600 ledger upserts.
5. **Idempotency.** Re-running the migrator on a migrated playbook is a 0-byte-change no-op. Re-running `converge task add` with an already-applied row returns `ok: true, idempotent: true`.
6. **Diff legibility.** A 200-row `tasks.jsonl` with one row edited produces a 1-line git diff (deterministic sort prevents reorder noise).

## What changes for users

- **Operators** see one file per playbook instead of `playbook.yml` + N `spawn.yml` files. `cat .converge/inventory/<pb>/tasks.jsonl` is the authoritative task catalogue.
- **Playbook authors** see no change to template authoring. They still write `templates/<name>/TASK.md` + `PARAMS.yml`. Static task authoring unchanged (`tasks/<id>/TASK.md`).
- **AI** appends rows via `converge task add` instead of writing `spawn.yml` files. Same validation, same feedback loop, different primitive.
- **CI** greps one file for the full task graph instead of walking directories.

## Anti-goals

- **NOT** embedding contract text into `tasks.jsonl`. The catalogue-row shape stays thin (identity + status + fingerprint). `EXPANDED.md` remains the contract file per RFC 0030.
- **NOT** changing the runner's DAG-compile path beyond switching the loader's discovery mechanism. The DAG shape, the topological sort, the cache predicate — all unchanged.
- **NOT** dropping `EXPANDED.md`. It's the human-readable, `cat`-able, `git diff`-able contract per RFC 0030. This RFC only changes how we discover which tasks exist, not where their contracts live.
- **NOT** silent dual-format support. A workspace with both formats is rejected; the migrator is mandatory.

## Why now

The `mezon-portal` playbook today has 133 `spawn.yml` files. Each one is 4 lines. Each one has a 1:1 sibling row in `tasks.jsonl`. When a spawned child's dependencies change, two files must be updated. When debugging "why didn't this run?", two files must be checked. The drift surface is real, the duplication is mechanical, and the fix is surgical: fold the three fields into the row.

RFC 0030 already established `EXPANDED.md` as the single source of truth for spawned contracts. This RFC completes the consolidation by making `tasks.jsonl` the single source of truth for task identity, dependencies, and provenance.

One file. One row schema. One discovery path. `template` + `params` + `depends_on` move from sidecar `spawn.yml` files into the task row itself; static and spawned tasks share the same interface, distinguished only by `taskRef.kind`.
