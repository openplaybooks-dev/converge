---
id: 06-migration
title: Migration shims, renamed verbs (deps, init --from-prompt), docs site
description: |
  Every removed v1 command prints a one-line v2 redirect with a non-zero
  exit code. Renamed verbs land: `deps` (replaces skills list/install),
  `init --from-prompt` (absorbs today's `plan`). The migration table from
  §10 of the spec doc is implemented row-by-row. The CLI reference docs
  site renders the new pages and retires the removed ones. `docs
  generate` / `docs serve` and `seed` are deferred to a follow-up
  playbook (see PLAN.md follow-ups).

dependencies:
  - 05-incremental-and-freshness

inputs:
  - "docs/design/cli-redesign.md"
  - "packages/cli/src/main.ts"
  - "docs/reference/cli/index.md"

outputs:
  - "packages/cli/src/migration-redirects.ts"
  - "packages/cli/src/commands-deps.ts"
  - "packages/cli/tests/integration/migration-redirects.test.ts"
  - "packages/cli/tests/integration/deps.test.ts"
  - "packages/cli/tests/integration/init-from-prompt.test.ts"
  - "docs/reference/cli/index.md"
  - "docs/reference/cli/build.md"
  - "docs/reference/cli/test.md"
  - "docs/reference/cli/compile.md"
  - "docs/reference/cli/list.md"
  - "docs/reference/cli/clean.md"
  - "docs/reference/cli/debug.md"
  - "docs/reference/cli/deps.md"
  - "docs/reference/cli/retry.md"
  - "docs/reference/cli/source.md"
  - "docs/reference/cli/select.md"

checks:
  - id: typecheck
    cmd: test -f package.json && pnpm -r typecheck
    description: Typecheck passes.
  - id: every-migration-row-tested
    cmd: cd packages/cli && pnpm test -- tests/integration/migration-redirects.test.ts
    description: Every row in the migration table (§10) has a regression test that asserts the redirect message and a non-zero exit code.
  - id: deps-renames-skills
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook
      ../../../dist/index.js deps list 2>&1 | head -1
      ../../../dist/index.js deps install --help 2>&1 | grep -qi 'install'
    description: "deps list and deps install work and replace today's skills list / skills install."
  - id: init-from-prompt
    cmd: cd packages/cli && pnpm test -- tests/integration/init-from-prompt.test.ts
    description: "init --from-prompt scaffolds a project (replacing today's plan command)."
  - id: removed-commands-exit-nonzero
    cmd: |
      cd packages/cli/tests/fixtures/minimal-playbook
      out=$(../../../dist/index.js verify 2>&1); rc=$?
      test $rc -ne 0
      echo "$out" | grep -qi 'use .*debug'
    description: Sample removed command (`verify`) prints v2 hint to stderr AND exits non-zero.
  - id: docs-build
    cmd: |
      # Whatever docs build command exists; placeholder check that all referenced .md files exist
      for f in docs/reference/cli/{index,run,build,test,compile,list,clean,debug,deps,retry,source,select,inspect,show,metrics,playbook}.md; do
        test -s "$f" || { echo "missing: $f"; exit 1; }
      done
    description: Every CLI reference page that the new index links to actually exists.
  - id: design-doc-status-banner-updated
    cmd: |
      grep -q 'Status: \*\*shipped' docs/design/cli-redesign.md || \
      grep -q 'Status: \*\*shipping' docs/design/cli-redesign.md
    description: Design doc status banner updated from "proposal" to "shipped"/"shipping".
  - id: cli-help-shows-v2-verbs
    cmd: |
      packages/cli/dist/index.js --help 2>&1 | grep -qE '(^|\s)build(\s|$)'
      packages/cli/dist/index.js --help 2>&1 | grep -qE '(^|\s)compile(\s|$)'
      packages/cli/dist/index.js --help 2>&1 | grep -qE '(^|\s)list(\s|$)'
    description: --help lists the new v2 verbs.

tags:
  - phase
  - migration
  - docs
---

# Migration

## Scope

Two parallel deliverables, both small but tedious:

### 1. Redirects for every removed v1 command

The migration table in §10 of the spec doc has roughly 25 rows. Each
removed command (`status`, `verify`, `playbook list`, `playbook info`,
`playbook history`, `skills list`, `skills install`, `goals`, `cleanup`,
`reset`, `checkpoint`, `plugins`, today's `--restart`/`--resume` flag
nuances, etc.) gets a redirect:

```
$ converge verify
'verify' has moved. Use: converge debug
(see docs/reference/cli/migration.md for the full migration table)
```

Exit code 2 (matches today's "did you mean" handling). Printed to stderr.

The redirects table lives in `packages/cli/src/migration-redirects.ts` —
a single map of `{ oldName: { hint, status: 'removed' | 'renamed' } }`.
The dispatcher checks this map *before* attempting to run the command,
so redirects are uniform and don't depend on per-command implementations.

### 2. Docs reference pages

Today's `docs/reference/cli/` has one page per intent-based command. The
new CLI has different verbs. This phase:
- Adds new pages: `build.md`, `test.md`, `compile.md`, `list.md`,
  `clean.md`, `debug.md`, `deps.md`, `retry.md`, `source.md`,
  `select.md` (the DSL reference).
- Updates `index.md` to reflect the new command grouping.
- Deletes (or rewrites as one-line "moved" pointers): pages for removed
  commands.
- Updates `docs/design/cli-redesign.md` status banner from "proposal" to
  "shipped" or "shipping" (whichever the user picks at this phase's
  start).

## TDD discipline

The redirects file has perfect TDD shape: write one row of the
integration test (asserting message + exit code) → RED → add row to map
→ GREEN. The per-layer planner can fan this out per row, or do it in
one pass with a parameterized test (`describe.each(MIGRATION_ROWS)`).

The docs pages don't TDD cleanly (they're prose). Acceptance is "the
referenced files exist, contain >0 lines, and the index links resolve"
— enforced by the `docs-build` check.

## Out of scope

- New tutorials / how-to guides for the v2 CLI. Reference pages only.
  Tutorials are a follow-up.
- Migrating existing playbooks in `examples/` to v2 syntax. Out of
  scope; existing playbooks already work because the path-based dispatch
  keeps working and `name:` substring is the default selector method.
- A formal release tag (npm publish, version bump). Decided at the
  user's discretion after this phase ships.
- `converge docs generate` and `converge docs serve`. Spec §3 lists them
  but they're a substantial new feature (static site rendering of the
  DAG + lineage). Deferred to a follow-up playbook.
- `converge seed`. Spec §3 lists it (mirrors `dbt seed` for fixture
  inputs). No clear use case in current Converge playbooks. Deferred.

## References

- Spec: `docs/design/cli-redesign.md` §10 (migration table — the source
  of truth for redirects).
- Existing redirect handling: `packages/cli/src/main.ts` already has a
  small set of legacy redirects (`tree → status`, `gantt → show gantt`,
  etc.). Extend the same pattern.
- Existing doc style: `docs/reference/cli/run.md` is the template for
  per-command pages.

## Open questions for the per-layer planner

- One redirect leaf per row, or one leaf for the whole table? Default:
  one leaf for the whole table (parameterized test) — the per-row
  granularity is too fine.
- Whether the design doc status banner ("proposal" → "shipped") happens
  at the start or end of this phase. Default: end (after all checks
  pass, so the banner reflects truth).
