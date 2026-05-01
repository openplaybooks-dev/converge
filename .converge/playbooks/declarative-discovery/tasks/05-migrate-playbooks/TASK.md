---
title: Add children: declarations to every parent TASK.md across every live playbook; verify parity
description: |
  Per-playbook fan-out using a spawning seed (dbt-paradigm). For each
  live entry in the catalog: walk the existing folder structure, infer
  parent-child edges, write children: declarations into every parent's
  TASK.md, and verify the migrated playbook produces the same DAG
  under both loaders. WBS-spawning parents get from_seed: declarations
  instead. After this phase, the flag-on (declarative) and flag-off
  (folder-scan) loaders agree on every live playbook.

inputs:
  - .converge/playbooks/declarative-discovery/playbooks-catalog.json
  - .converge/playbooks/declarative-discovery/REFS.md
  - docs/design/declarative-discovery.md
  - packages/core/src/config/declarative-loader.ts
  - packages/core/src/config/path-registry.ts
  - packages/core/src/runtime/seed-spawner.ts

outputs:
  - .converge/playbooks
  - examples
  - .converge/playbooks/declarative-discovery/migration-report.md
  - .converge/playbooks/declarative-discovery/seeds/migrate-one-playbook.seed.md

checks:
  - id: typecheck-green
    cmd: pnpm --filter @converge/core --filter @converge/cli typecheck
    description: Core and CLI typecheck.
  - id: tests-green
    cmd: pnpm --filter @converge/core --filter @converge/cli test
    description: All tests pass.
  - id: every-live-playbook-parity
    cmd: |
      while IFS= read -r path; do
        # Each live playbook must produce identical DAGs under both loaders.
        diff \
          <(node packages/cli/dist/index.js --project-dir "$(dirname "$path")" compile --playbook="$(basename "$path")" --json | jq '.nodes | keys') \
          <(CONVERGE_DECLARATIVE_DISCOVERY=1 node packages/cli/dist/index.js --project-dir "$(dirname "$path")" compile --playbook="$(basename "$path")" --json | jq '.nodes | keys') \
          || { echo "Parity failure: $path"; exit 1; }
      done < <(jq -r '.[] | select(.live == true) | .path' .converge/playbooks/declarative-discovery/playbooks-catalog.json)
    description: Every live playbook produces identical DAGs under both loaders.
  - id: every-parent-has-children-declaration
    cmd: |
      while IFS= read -r path; do
        parent_dirs=$(find "$path/tasks" -name TASK.md -mindepth 2 -exec dirname {} \; | xargs -I{} dirname {} | sort -u)
        for pd in $parent_dirs; do
          test -f "$pd/TASK.md" || continue
          if ! grep -qE '^children:|^from_seed:' "$pd/TASK.md"; then
            echo "Parent missing children: or from_seed: — $pd"
            exit 1
          fi
        done
      done < <(jq -r '.[] | select(.live == true) | .path' .converge/playbooks/declarative-discovery/playbooks-catalog.json)
    description: Every parent TASK.md in every live playbook declares its children.
  - id: migration-report-present
    cmd: test -s .converge/playbooks/declarative-discovery/migration-report.md
    description: Per-playbook migration report exists.
  - id: archived-playbooks-untouched
    cmd: |
      while IFS= read -r path; do
        test -d "$path" || exit 1
      done < <(jq -r '.[] | select(.live == false) | .path' .converge/playbooks/declarative-discovery/playbooks-catalog.json)
    description: Archived playbooks were not deleted by migration.

skills: []
references:
  - "docs/design/declarative-discovery.md"
  - ".converge/playbooks/declarative-discovery/playbooks-catalog.json"

vars: {}
dependencies:
  - 04-runtime-and-manifest
---

# 05 — Migrate every live playbook

Per-playbook fan-out via a spawning seed (dbt-paradigm). This phase
**dogfoods** dbt-paradigm's spawning-seed mechanism on a real workload —
useful integration evidence beyond the fixture playbook.

## How the fan-out works

This phase's TASK.md has `from_seed: migrate-one-playbook`. The seed
file at `.converge/playbooks/declarative-discovery/seeds/migrate-one-
playbook.seed.md` reads the catalog and emits one task per live entry.
Each spawned child runs the migration recipe below against one playbook.

(If the per-layer planner prefers, it can hand-write the tasks instead
of using a seed — but the seed approach is preferred because it
exercises the new mechanism on real data.)

## Per-playbook migration recipe

For each catalog entry with `live === true`, in this order:

### Step 1 — Walk the folder structure, infer edges

For each TASK.md in the playbook, identify its directory's
sub-directories that contain TASK.md files. Those are its children.

### Step 2 — Distinguish static vs dynamic children

A child is **dynamic** if its parent has `seeds: [<spawning-seed>]`
where `<spawning-seed>` is a spawning seed (dbt-paradigm). The
parent gets `from_seed: <name>` written; static children are not
listed (the seed produces them at runtime).

A child is **static** otherwise. The parent gets `children: [<id>, ...]`
in alphanumeric order.

### Step 3 — Write the declarations

Edit the parent's TASK.md frontmatter:
- Add `children:` and/or `from_seed:` fields.
- Do not modify any other field.
- Preserve frontmatter comment lines and field ordering otherwise.

For multi-parent children (rare today; possible after this playbook):
catalog flagged them in phase 01. Add the child id to *every* parent
that claims it.

### Step 4 — Verify parity

Run `converge compile --playbook=<id>` with the flag off, then on.
Diff the manifests. They must be identical (modulo loader-source
metadata if recorded). If they aren't, the migration is wrong; fix
the declarations.

### Step 5 — Append to the migration report

`.converge/playbooks/declarative-discovery/migration-report.md` gets
one section per playbook:
- Playbook id.
- Number of parents declared.
- Number of children declarations written.
- Number of `from_seed:` declarations written.
- Parity check: pass / fail.

## Self-host safety

The `declarative-discovery` playbook itself is in the catalog but is
**excluded from migration** — we don't migrate the playbook that's
running. Filter on `entry.id !== "declarative-discovery"`.

The dbt-paradigm playbook **is** included if still live. Migrating it
validates the recipe against a recent, complex playbook.

## Out of scope

- Folder-scan deletion (phase 06).
- Doc updates (phase 06).
- Archived playbooks (no-ops; phase 06 documents).

## Done when

All five checks pass. Every live playbook has every parent declaring
its children. Cross-loader parity passes for all of them. Migration
report enumerates every conversion.
