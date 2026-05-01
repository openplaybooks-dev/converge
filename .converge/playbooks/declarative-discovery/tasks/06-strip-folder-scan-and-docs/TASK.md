---
title: Delete folder-scan loader and the flag; write the user-facing guide; tombstone the old discovery code
description: |
  Hard cutover. Every live playbook is declarative (phase 05 verified
  parity). Delete the folder-scan branch in loader.ts, delete every
  helper used only by it, delete the flag, write the consolidated
  tombstone test, write the user guide. After this phase there is one
  loader and one way to discover tasks: declarations.

inputs:
  - .converge/playbooks/declarative-discovery/REFS.md
  - .converge/playbooks/declarative-discovery/migration-report.md
  - docs/design/declarative-discovery.md
  - packages/core/src/config/loader.ts
  - packages/core/src/config/declarative-loader.ts

outputs:
  - packages/core/src/config/loader.ts
  - packages/core
  - packages/cli
  - docs/guides/declarative-tasks.md
  - packages/core/tests/no-folder-scan.test.ts

checks:
  - id: typecheck-green
    cmd: pnpm -r typecheck
    description: All packages typecheck after deletion.
  - id: tests-green
    cmd: pnpm -r test
    description: All tests pass.
  - id: built-cli-exists
    cmd: test -x packages/cli/dist/index.js
    description: CLI builds end-to-end.
  - id: folder-scan-helpers-deleted
    cmd: "! grep -rln 'walkTasksDirectory\\|scanTaskDirectories' packages/core/src 2>/dev/null"
    description: Folder-scan helpers are gone.
  - id: flag-removed
    cmd: "! grep -rln 'CONVERGE_DECLARATIVE_DISCOVERY' packages/ 2>/dev/null"
    description: The CONVERGE_DECLARATIVE_DISCOVERY flag is gone — only one code path remains.
  - id: tombstone-test-present
    cmd: test -s packages/core/tests/no-folder-scan.test.ts
    description: Consolidated tombstone test exists.
  - id: guide-present
    cmd: test -s docs/guides/declarative-tasks.md
    description: User-facing guide exists.
  - id: every-live-playbook-still-loads
    cmd: |
      while IFS= read -r path; do
        node packages/cli/dist/index.js --project-dir "$(dirname "$path")" compile --playbook="$(basename "$path")" || exit 1
      done < <(jq -r '.[] | select(.live == true) | .path' .converge/playbooks/declarative-discovery/playbooks-catalog.json)
    description: Every live playbook still loads after the cutover.

skills: []
references:
  - ".converge/playbooks/declarative-discovery/REFS.md"
  - "docs/design/declarative-discovery.md"

vars: {}
dependencies:
  - 05-migrate-playbooks
---

# 06 — Strip folder-scan and write the guide

Inverted red-green at every leaf:
1. Write a negative-existence test.
2. Run — RED.
3. Delete until GREEN.
4. Leave the test as a tombstone.

`pnpm -r typecheck && pnpm -r test` must stay green at every step.

## What deletes

Per phase 01's REFS.md, in this order (to keep typecheck green):

1. **Strip the flag conditional** in `loader.ts`:
   - Remove the `if (process.env.CONVERGE_DECLARATIVE_DISCOVERY === '1')`
     branch. Inline the call to `loadPlaybookDeclaratively`.
   - Now `loader.ts` always uses the declarative loader.
2. **Delete the folder-scan helpers** in `loader.ts` (or wherever they
   live):
   - `walkTasksDirectory`
   - `scanTaskDirectories`
   - Any helper functions called only by these. (Use REFS.md's caller
     analysis to decide.)
3. **Delete tests asserting folder-scan behavior** (REFS.md lists them).
   Replace with `no-folder-scan.test.ts` that asserts the absence.
4. **Delete the flag from `playbook.yml`** (the `flag_env` var was
   referenced for documentation; remove it).

## Tombstone test

`packages/core/tests/no-folder-scan.test.ts`:
- `expect(fs.existsSync(...))` — false for any deleted helper modules.
- `expect(loader source).not.toMatch(/walkTasksDirectory/)` — sanity
  check the function is not redefined.
- `expect(env CONVERGE_DECLARATIVE_DISCOVERY)` — absent in source.
- A behavioral assertion: a playbook with TASK.md files in
  `tasks/` that are NOT declared in `children:` must NOT be discovered.
  This proves folder-scan is truly gone — undeclared tasks are
  invisible.

## User-facing guide

`docs/guides/declarative-tasks.md`:

1. **The model.** A playbook is a declared graph. `playbook.yml` lists
   roots; each TASK.md declares its children. Filesystem layout is
   convention, not contract.
2. **Authoring a task.** Three steps: write the TASK.md, drop it
   somewhere, list the id in the parent's `children:`. The third step
   is mandatory — without it, the task doesn't exist as far as the
   runner is concerned.
3. **Hybrid syntax.** Bare id (default path), object form with `path:`
   override, `from_seed:` for dynamic children.
4. **Multi-parent.** Two parents can claim the same child id. The DAG
   records two incoming edges. Use cases: shared subtasks, fan-in
   patterns.
5. **Spawning seeds.** Cross-reference the dbt-paradigm guide for the
   seed library; document that a `from_seed:` parent's children are
   materialized at runtime and live wherever the seed places them.
6. **Lint and tooling.** A `converge debug --check-discovery` (or
   equivalent existing verb) reports orphan TASK.md files (on disk but
   not declared) and missing children (declared but not on disk).
   Authors run this before committing.
7. **Migration path for external users.** Anyone with a playbook that
   relied on folder-scan: copy the structure into `children:` lists
   following the recipe in phase 05. The migration script (phase 05's
   spawning seed) is left in place under
   `.converge/playbooks/declarative-discovery/seeds/` for reference.

## Out of scope

- New features beyond the cutover.
- Re-migrating playbooks (phase 05 is final).
- New tests beyond the tombstone.

## Done when

All eight checks pass. There is one loader. There is one way to
discover tasks. The guide describes it. The tombstone prevents the old
behavior from sneaking back.
