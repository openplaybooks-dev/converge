---
title: Add children: declarations to every parent TASK.md across every live playbook; verify parity
description: |
  Per-playbook fan-out. For each live entry in the catalog: walk the
  existing folder structure, infer parent-child edges, write children:
  declarations into every parent's TASK.md, and verify the migrated
  playbook produces the same DAG under both loaders. After this phase,
  every live playbook is declarative — the prerequisite for deleting
  the tree abstractions in phase 06.

inputs:
  - .converge/playbooks/declarative-discovery/playbooks-catalog.json
  - .converge/playbooks/declarative-discovery/REFS.md
  - docs/design/declarative-discovery.md
  - packages/core/src/config/declarative-loader.ts
  - packages/core/src/config/path-registry.ts

outputs:
  - .converge/playbooks
  - examples
  - .converge/playbooks/declarative-discovery/migration-report.md

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

skills: []
references:
  - "docs/design/declarative-discovery.md"
  - ".converge/playbooks/declarative-discovery/playbooks-catalog.json"

vars: {}
dependencies:
  - 03-dag-runner
---

# 04 — Migrate every live playbook

Per-playbook fan-out. After this phase, every live playbook is
declarative — the prerequisite for deleting tree code in phase 06.

## Per-playbook migration recipe

For each catalog entry with `live === true`:

### Step 1 — Walk folder structure, infer edges

For each TASK.md, identify its directory's sub-directories that contain
TASK.md files. Those are its children.

### Step 2 — Distinguish static vs dynamic

- **Dynamic**: parent has `seeds: [<spawning-seed>]` → write
  `from_seed: <name>`.
- **Static**: otherwise → write `children: [<id>, ...]` in alphanumeric
  order.

### Step 3 — Write declarations

Edit the parent's TASK.md frontmatter:
- Add `children:` and/or `from_seed:` fields.
- Do not modify any other field.
- For multi-parent children (rare today): add the child id to every
  parent that claims it.

### Step 4 — Verify parity

Run `converge compile --playbook=<id>` with flag off and on.
Manifests must be identical (modulo metadata).

### Step 5 — Append to migration report

One section per playbook: id, parents declared, children written,
`from_seed:` count, parity result.

## Self-host safety

The `declarative-discovery` playbook itself is excluded from migration.
We don't migrate the playbook that's running.

## Done when

All checks pass. Every live playbook has every parent declaring its
children. Cross-loader parity passes for all.
