---
title: Verify predecessors merged; write design doc, REFS inventory, migration catalog
description: |
  Verify all three predecessor playbooks (cli-redesign, remove-goals,
  dbt-paradigm) are merged on main, then produce the design doc and the
  two inventories that every later phase reads as input. No code ships
  in this phase.

inputs:
  - docs/design/cli-redesign.md
  - .converge/playbooks/dbt-paradigm/PLAN.md
  - packages/core/src/config/loader.ts
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/manifest

outputs:
  - docs/design/declarative-discovery.md
  - .converge/playbooks/declarative-discovery/REFS.md
  - .converge/playbooks/declarative-discovery/playbooks-catalog.json
  - .converge/playbooks/declarative-discovery/contract-probe-report.md

checks:
  - id: contract-probe-report-present
    cmd: test -s .converge/playbooks/declarative-discovery/contract-probe-report.md
    description: Contract probe (00-contract-probe leaf) ran and its report exists.
  - id: design-doc-present
    cmd: test -s docs/design/declarative-discovery.md
    description: Design doc exists and is non-empty.
  - id: refs-md-present
    cmd: test -s .converge/playbooks/declarative-discovery/REFS.md
    description: Folder-scan callsite inventory exists.
  - id: catalog-valid-json
    cmd: jq -e 'type == "array"' .converge/playbooks/declarative-discovery/playbooks-catalog.json
    description: Per-playbook migration catalog is a JSON array.
  - id: baseline-tests-green
    cmd: pnpm -r test
    description: Baseline test suite green before any work begins.

skills: []
references:
  - "docs/design/cli-redesign.md"
  - "@.converge/playbook-chain.md"
  - ".converge/playbooks/dbt-paradigm/PLAN.md"

vars: {}
dependencies: []
---

# 01 — Survey and discovery spec

Four artifacts ship in this phase. Code-only phases come later.

## Step 0 — Contract probe (failing-fast gate)

The `00-contract-probe/` sub-task runs first. It performs behavioral
checks against cli-redesign, remove-goals, and (most importantly)
dbt-paradigm — verifying that `child-synthesizer.synthesize`,
`seed-spawner.spawnDynamicChildren`, the seed/test schemas, the
manifest's `libraries:` section, and the absence of WBS all hold as
this playbook's later phases assume. If a probe fails, a predecessor's
contract drifted; the affected phase 02–06 TASK.md must be revised
before the rest of phase 01 proceeds.

See `.converge/playbook-chain.md` for the per-edge contract this probe
guards.

## Step 1 — `docs/design/declarative-discovery.md`

The spec of record. Sections, in order:

1. **Motivation.** What folder-scan discovery costs us (non-deterministic
   DAG construction, implicit parent-child edges, dynamic spawning has
   to live as filesystem mutations, tasks can't be shared between
   parents). What declarative buys (deterministic, location-independent
   children, DAG-not-tree, scalable authoring).
2. **The `children:` field.** Hybrid syntax — bare id, object form with
   `path:` override, `from_seed:` for dynamic. Concrete YAML examples.
3. **The path registry.** Implicit, built by the loader. Shape: `id →
   path`. Conflict resolution: duplicate ids are an error. Optional
   serialization into the manifest under `metadata.registry`.
4. **Spawning-seed integration.** A spawning seed (dbt-paradigm) emits
   `{ tasks: [{ id, vars, path? }] }`. If `path` is omitted, default to
   `<parent-dir>/_spawned/<id>/TASK.md`. Either way, the manifest
   records the parent-child edge. The path is metadata.
5. **DAG semantics.** Two parents may claim the same child id (multi-
   parent). Cycles are an error. Phase 04 confirms.
6. **The cutover plan.** Phase 03 lands the new loader behind the flag
   `CONVERGE_DECLARATIVE_DISCOVERY`. Phase 04 wires runtime + manifest.
   Phase 05 migrates every live playbook. Phase 06 deletes folder-scan
   and the flag. No fallback.
7. **Selector compatibility.** Existing `--select` grammar reads the
   manifest, which is the same shape post-cutover. `name:`, `tag:`,
   `path:`, `phase:`, `status:`, `result:`, `state:modified.*`,
   `frontier:` etc. all keep working unchanged.
8. **Open questions (resolved).** The 6 questions from `PLAN.md`,
   resolved with defaults or explicit deferrals.

The doc references the cli-redesign and dbt-paradigm specs heavily; it
is short on exposition and long on locked-in contracts.

## Step 2 — `.converge/playbooks/declarative-discovery/REFS.md`

Every callsite of folder-scan logic. Two sections:

### Folder-scan code paths in the loader

For each:
- file:line range
- function name
- list of incoming callers (via `grep -rln`)
- one-line role description

Required entries (verify each in the current `loader.ts`; the names may
have changed):
- `walkTasksDirectory` (or equivalent) — the recursive walker.
- `scanTaskDirectories` — directory traversal.
- Any helpers that read directory contents to discover TASK.md files
  (as opposed to consulting the registry).

### Tests asserting folder-scan behavior

Tests under `packages/core/tests/` that exercise the folder-scan path
specifically (as opposed to using it incidentally). These get deleted
or rewritten in phase 06.

## Step 3 — `.converge/playbooks/declarative-discovery/playbooks-catalog.json`

JSON array, one entry per playbook to migrate:

```json
[
  {
    "id": "cli-redesign",
    "path": ".converge/journal/cli-redesign",
    "live": true,
    "task_count": 63,
    "max_depth": 3,
    "uses_seeds": true,
    "uses_from_seed_candidates": ["tasks/03-execution-verbs"],
    "notes": "Self-host playbook; predecessor."
  }
]
```

Fields:
- `id`, `path`, `live` — same shape as dbt-paradigm's catalog.
- `task_count` — total TASK.md files.
- `max_depth` — max nesting depth (informs migration complexity).
- `uses_seeds` — whether the playbook uses dbt-paradigm seeds (every
  playbook should after dbt-paradigm merge; flag for review if any
  don't).
- `uses_from_seed_candidates` — parent paths that today use spawning
  seeds (these become `from_seed:` in phase 05).
- `notes` — anything phase 05's migration script should know.

Cover every directory under `.converge/playbooks/` and `examples/` with
a `playbook.yml`.

## Done when

All seven checks pass; the three artifacts exist; a reviewer reading
just the design doc could implement phase 02.
