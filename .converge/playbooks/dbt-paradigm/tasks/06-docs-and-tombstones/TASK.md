---
title: Documentation, archived-playbook README notes, final tombstone consolidation
description: |
  The framework is now fully on the dbt model. Document it: the
  three-roots-one-DAG architecture, the two seed roles, the new check
  type. Add notes to archived playbooks explaining why they keep their
  legacy shape. Cross-reference cli-redesign's migration table to point
  at this playbook for the deferred seed work.

inputs:
  - docs/design/dbt-paradigm.md
  - docs/design/cli-redesign.md
  - .converge/playbooks/dbt-paradigm/playbooks-catalog.json
  - .converge/playbooks/dbt-paradigm/migration-report.md
  - packages/core/src/config/seed-md-definition.ts
  - packages/core/src/config/test-md-definition.ts
  - packages/core/src/runtime/seed-resolver.ts
  - packages/core/src/runtime/seed-spawner.ts

outputs:
  - docs/guides/seeds-tasks-tests.md
  - docs/reference/cli/seed.md
  - docs/reference/cli/test.md
  - docs/design/cli-redesign.md
  - examples
  - packages/core/tests/no-legacy-api.test.ts

checks:
  - id: typecheck-green
    cmd: pnpm -r typecheck
    description: Repo still typechecks.
  - id: tests-green
    cmd: pnpm -r test
    description: All tests pass.
  - id: seeds-tasks-tests-guide-present
    cmd: test -s docs/guides/seeds-tasks-tests.md
    description: The user-facing guide exists.
  - id: cli-seed-doc-present
    cmd: test -s docs/reference/cli/seed.md
    description: CLI reference covers the seed selector and compile --seed.
  - id: cli-test-doc-present
    cmd: test -s docs/reference/cli/test.md
    description: CLI reference covers the test selector and the test-reference check type.
  - id: cli-redesign-cross-reference
    cmd: grep -q 'dbt-paradigm' docs/design/cli-redesign.md
    description: cli-redesign migration table points at this playbook for the deferred seed work.
  - id: archived-playbooks-have-readme-notes
    cmd: |
      while IFS= read -r path; do
        test -f "$path/README.md" || { echo "missing README in archived: $path"; exit 1; }
      done < <(jq -r '.[] | select(.live == false) | .path' .converge/playbooks/dbt-paradigm/playbooks-catalog.json)
    description: Every archived playbook carries a README explaining the legacy shape.
  - id: no-legacy-leakage-in-docs
    cmd: |
      hits=$(grep -rnE '\b(dod-runner|gap-ledger|fabrication-scanner|backlog-bridge|GoalDef|wbs-executor)\b' docs/ packages/ 2>/dev/null \
        | grep -v 'docs/design/cli-redesign.md' \
        | grep -v 'docs/design/dbt-paradigm.md' \
        | grep -v '.converge/playbooks/dbt-paradigm/REFS.md' \
        | grep -v 'no-legacy-api.test.ts' || true)
      test -z "$hits"
    description: Legacy symbols appear only in acknowledged historical mentions.

skills: []
references:
  - "docs/design/dbt-paradigm.md"
  - "docs/design/cli-redesign.md"

vars: {}
dependencies:
  - 04-strip-legacy
---

# 06 — Documentation and tombstones

The framework is on the new model. Make it discoverable.

## What lands

### `docs/guides/seeds-tasks-tests.md`

The user-facing guide. Topics, in order:

1. **The three roots.** A playbook has `tasks/`, `seeds/`, `tests/`.
   Only `tasks/` is in the DAG. Show a one-page tree of a real example.
2. **When to use which.** Decision tree: do I need a new node in the
   DAG? Use a task. Do I need preparation that feeds into a task? Use a
   seed. Do I need a check that's repeated across tasks? Use a test.
3. **The two seed roles.** Worked examples — a context seed
   (`fetch-corpus.seed.md`) and a spawning seed
   (`per-token.seed.md`). Show the parent task in each case.
4. **The check union.** Show a task whose `checks:` array mixes inline
   checks and test references.
5. **Selectors.** `seed:<name>`, `test:<name>`, plus a recap of
   `frontier:` / `expected:` / `concrete:` from cli-redesign.
6. **Migrating from WBS.** A short before/after demonstrating the
   conversion of a WBS parent into a spawning seed.

Anchor all examples in real, copy-pasteable file shapes — not
hand-waved snippets.

### `docs/reference/cli/seed.md`

Two sections:
- **Compile-time:** `converge compile --seed --select '<parent>'` runs a
  spawning seed without running the spawned tasks. Same shape as the
  legacy WBS seeding — point at cli-redesign §2 for the underlying
  manifest semantics.
- **Selection:** `--select 'seed:<name>'` selects tasks whose `seeds:`
  list references the name.

### `docs/reference/cli/test.md`

One section explaining that `test:<name>` selects tasks whose original
`checks:` array contained a reference to the named test. (The check is
expanded to inline at config-load, but the original reference is
queryable.) Cross-reference the guide for the check-union shape.

### `docs/design/cli-redesign.md` follow-up note

Edit the migration table at §10. The row that says `converge seed →
deferred to follow-up playbook` gets a one-line update pointing at
`dbt-paradigm` and clarifying the resolution: seeds are not a top-level
verb; they are a library referenced from tasks, with `compile --seed`
as the only verb-level surface.

Also: any §10 reference to `wbs:` gets a note that the field is removed
in `dbt-paradigm`.

### Archived-playbook README notes

For every catalog entry where `live === false`, add a `README.md` to
the playbook directory:

> This playbook is archived. It uses the legacy WBS API which was
> removed in `dbt-paradigm`. It is preserved as a historical reference
> and is not maintained. Do not run it against current `converge`.

### Tombstone test consolidation (final)

Phase 04 wrote `packages/core/tests/no-legacy-api.test.ts`. If
per-leaf negative-existence tests were left distributed (the planner's
call), consolidate them now. The single file should assert every
deletion and every removed schema field in one place.

## Out of scope

- Adding new features.
- Touching the live playbooks (phase 05 finished that).
- New tests beyond the consolidated tombstone.

## Done when

All eight checks pass. A reader following the guide can write a
playbook with seeds, tests, and tasks from scratch using only the
documented surfaces. The cli-redesign design doc no longer leaves
`seed` as an open question.
