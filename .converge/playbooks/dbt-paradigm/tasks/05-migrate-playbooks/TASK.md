---
title: Migrate every live playbook from WBS + inline-checks to seeds + tests
description: |
  Per-playbook fan-out, driven by the catalog produced in phase 01. For
  each live entry: convert every wbs: parent into a seed reference, lift
  repeated checks into the playbook's tests/ library, lift externally-
  sourced inputs into context seeds where it makes the task self-
  contained. Archived playbooks are no-ops. This is the LAST phase that
  uses the legacy WBS executor — by design — to migrate every playbook
  off WBS so phase 04 can delete the executor.

inputs:
  - .converge/playbooks/dbt-paradigm/playbooks-catalog.json
  - .converge/playbooks/dbt-paradigm/REFS.md
  - docs/design/dbt-paradigm.md
  - packages/core/src/runtime/seed-resolver.ts
  - packages/core/src/runtime/seed-spawner.ts
  - packages/core/src/config/seed-md-definition.ts
  - packages/core/src/config/test-md-definition.ts

outputs:
  - .converge/playbooks
  - examples
  - .converge/playbooks/dbt-paradigm/migration-report.md

checks:
  - id: typecheck-green
    cmd: pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Core and CLI typecheck after every playbook is migrated.
  - id: tests-green
    cmd: pnpm --filter @converge/core --filter @converge/cli test
    description: All tests pass.
  - id: no-wbs-frontmatter-in-live-playbooks
    cmd: |
      while IFS= read -r path; do
        if grep -rE '^wbs:' "$path" >/dev/null 2>&1; then
          echo "Live playbook still has wbs: frontmatter: $path"
          exit 1
        fi
      done < <(jq -r '.[] | select(.live == true) | .path' .converge/playbooks/dbt-paradigm/playbooks-catalog.json)
    description: No live playbook still uses the wbs frontmatter field.
  - id: every-live-playbook-compiles
    cmd: |
      while IFS= read -r path; do
        node packages/cli/dist/index.js --project-dir "$(dirname "$path")" compile --playbook="$(basename "$path")" || exit 1
      done < <(jq -r '.[] | select(.live == true) | .path' .converge/playbooks/dbt-paradigm/playbooks-catalog.json)
    description: Every live playbook compiles cleanly after migration.
  - id: migration-report-present
    cmd: test -s .converge/playbooks/dbt-paradigm/migration-report.md
    description: Per-playbook migration report exists.
  - id: archived-playbooks-untouched
    cmd: |
      while IFS= read -r path; do
        # Archived playbooks must still have their wbs: if they had it.
        # We don't assert content here — just that the migration didn't
        # accidentally rewrite them. A git-status check would be more
        # precise; this check is documentation of intent.
        test -d "$path" || exit 1
      done < <(jq -r '.[] | select(.live == false) | .path' .converge/playbooks/dbt-paradigm/playbooks-catalog.json)
    description: Archived playbooks were not deleted by migration.

skills: []
references:
  - "docs/design/dbt-paradigm.md"
  - ".converge/playbooks/dbt-paradigm/playbooks-catalog.json"
  - ".converge/playbooks/dbt-paradigm/REFS.md"

vars: {}
dependencies:
  - 03-runtime-and-spawning
---

# 05 — Migrate every live playbook

Per-playbook fan-out. The natural shape is one child per playbook entry.
Spawn that fan-out using the **legacy WBS executor** (which still exists
at this point — phase 04 deletes it). This is the last code in the repo
that uses WBS, by design.

## How the fan-out works

The phase's `wbs:` (yes, this phase still uses legacy WBS — see
sequencing rationale in the root PLAN) reads
`.converge/playbooks/dbt-paradigm/playbooks-catalog.json` and spawns one
child per entry where `live === true`. Each spawned child runs the
migration recipe below against one playbook.

If you (the per-layer planner) want to use spawning seeds instead of
legacy WBS for *this* phase, you may — phase 03 just landed them — but
the simpler path is to use WBS one last time, since the catalog format
matches what WBS already understands. The end result is identical.

## Per-playbook migration recipe

For each catalog entry with `live === true`, in this order:

### Step 1 — Convert WBS parents to spawning seeds

For each path in `entry.wbs_parents`:

a. Read the parent's `wbs:` frontmatter and the linked
   `wbs/index.js` script (or template directory).
b. Synthesize an equivalent **spawning seed** at
   `<playbook>/seeds/<name>.seed.md`. Frontmatter:
   - `name: <derived-from-parent-id>`
   - `kind: spawning`
   - `description:` — one line summarizing what the seed produces.
   - `args:` — same as the WBS script's accepted vars (likely empty).
   - `preview_manifest:` — copy from the parent's existing
     `wbs.preview_manifest:` if present, else omit.
c. Body: encode the same logic as `wbs/index.js`. If the script reads a
   catalog file and emits per-entry bindings, that translates directly.
   Reuse: phase 03 extracted child synthesis into
   `packages/core/src/runtime/child-synthesizer.ts`. The seed body's
   contract is "produce `{ tasks: [{ id, vars }] }`" — the synthesizer
   does the rest.
d. Replace the parent's `wbs:` frontmatter with `seeds: [<name>]`.
e. Delete the `wbs/` directory under the parent.

### Step 2 — Lift repeated checks into tests/

For each entry in `entry.repeated_checks` (a check that appears ≥ 2
times across this playbook's tasks):

a. Synthesize a `<playbook>/tests/<name>.test.md`. Frontmatter:
   - `name:` — pick a descriptive name; record collisions.
   - `args:` — parameters that vary across the call sites.
   - `cmd:` — the check command with `{{ args.* }}` placeholders.
b. Replace each occurrence in the affected tasks' `checks:` arrays with
   the test-reference shorthand `test:<name>(arg1=..., arg2=...)`.

### Step 3 — Lift externally-sourced inputs into context seeds

For each entry in `entry.external_inputs`:

a. Decide whether the input is genuinely seed-shaped (something fetched,
   rendered, or computed once and reused) or whether it's already an
   upstream task's output (in which case it stays as an `inputs:`
   reference). The catalog flagged candidates; the planner judges each.
b. Where extraction makes sense, synthesize a context seed under
   `<playbook>/seeds/`. The task's `seeds:` list references it.

### Step 4 — Verify the migrated playbook compiles

Run `converge compile --playbook=<name>`. Assert it exits 0 and the
manifest has the expected shape (parents now `state: frontier` until
seeded; `libraries:` section lists the new entries).

### Step 5 — Append to the migration report

Append a section to
`.converge/playbooks/dbt-paradigm/migration-report.md`:

- Playbook id.
- Number of WBS parents converted.
- Number of tests extracted.
- Number of context seeds created.
- Manifest diff summary (counts of `frontier` / `expected` /
  `concrete` nodes before vs after).

## Self-host safety

The `dbt-paradigm` playbook itself is in the catalog but is **excluded
from migration** — we don't migrate the playbook that's running. Filter
on `entry.id !== "dbt-paradigm"` in the fan-out.

The two predecessor playbooks (`cli-redesign`, `remove-goals`) **are**
included if they're still live in the catalog. Migrating them validates
the recipe end-to-end.

## TDD discipline

For each migrated playbook, the leaf order is:
1. Write a smoke test: `converge compile --playbook=<id>` exits 0 against
   the *unmigrated* playbook (proves the baseline).
2. Apply the recipe.
3. Run the smoke test again — must still pass.
4. Add a stronger assertion: every former WBS parent now has `seeds:`
   instead of `wbs:`.

If a playbook's compile fails after migration, do not fall through. Halt
and surface the error — the migration recipe needs fixing or the
playbook needs hand-massaging.

## Out of scope (do not touch)

- Deletion of `wbs-executor.ts` or `wbs:` schema field (phase 04).
- Documentation pages (phase 06).
- Archived playbooks (no-ops; phase 06 adds README notes).

## Done when

All six checks pass. Every live playbook has been migrated and its
manifest compiles cleanly. The migration report enumerates every
conversion. No live playbook still has `wbs:` frontmatter. The legacy
WBS executor is still on disk (phase 04 deletes it) but no playbook
exercises it anymore.
