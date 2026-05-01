---
title: Survey legacy surface and write the dbt-paradigm design doc
description: |
  Verify both predecessor playbooks are merged on main, then produce the
  design doc and legacy-removal inventory that every later phase reads as
  input. Nothing in this phase ships code.

inputs:
  - docs/design/cli-redesign.md
  - .converge/journal/cli-redesign/PLAN.md
  - .converge/playbooks/remove-goals/PLAN.md
  - packages/core/src/config/task-md-definition.ts
  - packages/core/src/config/loader.ts
  - packages/core/src/executor/wbs-executor.ts
  - packages/core/src/executor/wbs-target-utils.ts

outputs:
  - docs/design/dbt-paradigm.md
  - .converge/playbooks/dbt-paradigm/REFS.md
  - .converge/playbooks/dbt-paradigm/playbooks-catalog.json
  - .converge/playbooks/dbt-paradigm/contract-probe-report.md

checks:
  - id: contract-probe-report-present
    cmd: test -s .converge/playbooks/dbt-paradigm/contract-probe-report.md
    description: Contract probe (00-contract-probe leaf) ran and its report exists.
  - id: design-doc-present
    cmd: test -s docs/design/dbt-paradigm.md
    description: Design doc exists and is non-empty.
  - id: refs-md-present
    cmd: test -s .converge/playbooks/dbt-paradigm/REFS.md
    description: Legacy-removal inventory exists.
  - id: playbooks-catalog-valid-json
    cmd: jq -e 'type == "array"' .converge/playbooks/dbt-paradigm/playbooks-catalog.json
    description: Per-playbook migration catalog is a JSON array.
  - id: baseline-tests-green
    cmd: pnpm -r test
    description: Baseline test suite is green before any work begins.

skills: []
references:
  - "@~/.claude/plans/check-users-minh-documents-converge-docs-starry-gizmo.md"
  - "@.converge/playbook-chain.md"
  - "docs/design/cli-redesign.md"

vars: {}
dependencies: []
---

# 01 — Survey and paradigm spec

This phase produces four artifacts that every later phase reads:

1. **`.converge/playbooks/dbt-paradigm/contract-probe-report.md`** —
   produced by the `00-contract-probe/` leaf. Behavioral verification
   that cli-redesign and remove-goals contracts hold.
2. **`docs/design/dbt-paradigm.md`** — the spec of record.
3. **`.converge/playbooks/dbt-paradigm/REFS.md`** — the legacy-removal
   inventory (which files get deleted in phase 04, by line count and
   incoming-edge count).
4. **`.converge/playbooks/dbt-paradigm/playbooks-catalog.json`** — per-
   playbook migration catalog consumed by phase 05's WBS.

## Step 0 — Contract probe (failing-fast gate)

The `00-contract-probe/` sub-task runs first. It performs behavioral
checks against cli-redesign and remove-goals — not just file-existence.
If a probe fails, a predecessor's contract drifted; the affected phase
02–06 TASK.md must be revised before the rest of phase 01 proceeds.

See `.converge/playbook-chain.md` for the per-edge contract this probe
guards.

## Step 1 — Write the design doc

Create `docs/design/dbt-paradigm.md`. The doc must answer, with examples:

- **Library shape.** Where do `seeds/` and `tests/` live? What's the
  filename convention? What's in the frontmatter? What's in the body?
- **The two seed roles.** Define **context seed** (produces a blob fed
  into a referencing task's input bundle) and **spawning seed** (produces
  a task-binding manifest the runtime materializes children from). Lock
  in the discriminator (default proposed in the plan: explicit `kind:
  context | spawning` field — confirm or change).
- **The new check type.** `checks:` becomes a discriminated union: inline
  (existing) plus test-reference (new). Document the object form
  `{ type: test, name, args }` and the string shorthand
  `test:<name>(args?)`. State explicitly: the loader expands every test
  reference into an inline check at config-load time; the runtime never
  sees a test reference.
- **Args contract.** How `args` flow into seed bodies and test cmd
  templates (default proposed: `{{ args.* }}` substitution, parallel to
  task `vars:`).
- **Spawning-seed contract with the manifest.** How an unrun spawning-
  seed parent maps to `frontier` / `expected` / `concrete` from
  cli-redesign's three-state manifest. How `compile --seed` runs the
  seed without running the spawned tasks.
- **Spawned-task identity.** Spawning-seed output entries must include a
  stable `id` field. The runtime errors out if IDs change between runs
  without `--full-refresh`.
- **Selectors.** `seed:<name>` selects tasks whose `seeds:` references
  the name; `test:<name>` selects tasks whose original `checks:` array
  contained a `test:<name>` reference (the loader records this for
  selection even after expansion).
- **Open questions resolution.** The 8 open questions from `PLAN.md` —
  resolve each with a default or an explicit "deferred and why."

The doc references `docs/design/cli-redesign.md` heavily and uses the same
tone (concrete, numbered sections, examples). It is the spec of record:
phases 02–06 cite section numbers from it.

## Step 2 — Write the legacy-removal inventory

Create `.converge/playbooks/dbt-paradigm/REFS.md`. Two sections:

### Pass A — WBS API (deleted in phase 04 after phase 05)

For each file:
- absolute path
- line count
- list of every importer (`grep -rln <basename> packages/`)
- one-line role description

Required entries:
- `packages/core/src/executor/wbs-executor.ts`
- `packages/core/src/executor/wbs-target-utils.ts`
- the `wbs:` frontmatter field in
  `packages/core/src/config/task-md-definition.ts` (line numbers)
- the `wbs:` selector method (if `cli-redesign` shipped one)
- every `wbs/` directory under `examples/` and `.converge/playbooks/`
  (find with `find . -type d -name wbs`)

### Pass B — dod / legacy concepts (deleted in phase 04)

Same shape per file. Required candidate set (verify each is actually dod-
or backlog-tied before listing — synthesis/ may be load-bearing for
non-dod paths; do not list a file unless it's confirmed legacy):
- `packages/core/src/converge/dod-runner.ts`
- `packages/core/src/converge/gap-ledger.ts`
- `packages/core/src/converge/backlog-bridge.ts`
- `packages/core/src/converge/weights.ts`
- `packages/cli/src/fabrication-scanner.ts`
- `packages/cli/src/commands-backlog.ts`
- `packages/cli/src/autonomous-run.ts` (its functions move to
  `commands-run.ts` — list which functions)
- candidate `synthesis/` modules (one line each: keep or delete, with
  reason)
- any remaining `epic` references (if `remove-epic` left tombstones)

REFS.md is exhaustive. Phase 04 reads it as a checklist.

## Step 3 — Write the per-playbook migration catalog

Create `.converge/playbooks/dbt-paradigm/playbooks-catalog.json`. A JSON
array, one entry per playbook to migrate:

```json
[
  {
    "id": "cli-redesign",
    "path": ".converge/journal/cli-redesign",
    "live": true,
    "wbs_parents": ["tasks/03-execution-verbs"],
    "repeated_checks": [],
    "external_inputs": [],
    "notes": "Self-host playbook; predecessor."
  }
]
```

Fields:
- `id` — playbook directory name.
- `path` — relative path from repo root.
- `live` — `true` if we maintain it; `false` if archived/frozen.
  Archived playbooks are no-ops in phase 05; phase 06 adds a README note.
- `wbs_parents` — list of TASK.md paths whose frontmatter has `wbs:`.
  Each becomes a `seeds: [<name>]` reference in phase 05.
- `repeated_checks` — checks that appear ≥ 2 times across this playbook's
  tasks (candidates for extraction into `tests/`).
- `external_inputs` — `inputs:` paths sourced outside the playbook tree
  (candidates for context-seed extraction).
- `notes` — anything phase 05 should know.

Cover at minimum: every directory under `.converge/playbooks/` and every
directory under `examples/` that contains a `playbook.yml`.

## Done when

- All six checks above pass.
- The three output files exist and are non-empty.
- A reviewer reading just `docs/design/dbt-paradigm.md` could implement
  phase 02 without consulting any other source.
