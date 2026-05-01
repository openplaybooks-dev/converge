---
id: 06-docs-and-cleanup
title: Delete CLI goals docs; prune indices; purge prose mentions; consolidate
  tombstone test
description: |
  Final phase. The code is gone (phases 01–05). Now docs catch up:
  delete the `converge goals` reference page, remove (or rewrite) the
  "articulate your goal" guide, prune doc indices, and run a WBS pass that
  removes prose mentions of the goal concept from remaining docs.

  As a final tidy step, consolidate the per-leaf negative-existence tests
  scattered across phases 02–05 into a single
  `tests/no-goals.test.ts` tombstone — a permanent regression gate that
  makes goal readmission a typecheck/test failure.

  After this phase, `grep -rn '\\bgoal\\b' docs/ packages/` returns hits only
  in (a) the consolidated tombstone test and (b) the cli-redesign migration
  table (which is a historical snapshot and not edited).
dependencies:
  - 05-delete-cli-surface
inputs:
  - docs/_cli-commands.json
  - docs/_sources.json
  - docs/_ia.json
  - docs/comparisons.md
  - docs/getting-started/from-problem-to-playbook.md
  - docs/getting-started/your-first-playbook.md
  - docs/getting-started/next-steps.md
  - docs/guides/customize-an-example.md
  - docs/guides/research-a-topic-deeply.md
  - docs/guides/README.md
  - docs/reference/core-api.md
  - docs/reference/task-md.md
  - docs/reference/cli/index.md
  - docs/reference/cli/plan.md
  - docs/design/editor-app-proposal.md
  - docs/design/progressive-decomposition.md
outputs:
  - docs/_cli-commands.json
  - docs/_sources.json
  - docs/_ia.json
  - docs/reference/cli/index.md
  - tests/no-goals.test.ts
checks:
  - id: typecheck-green
    cmd: test -f package.json && pnpm -r --filter './packages/core' --filter
      './packages/cli' --filter './packages/navigator' typecheck
    description: Typecheck green.
  - id: tests-green
    cmd: test -f package.json && pnpm -r --filter './packages/core' --filter
      './packages/cli' --filter './packages/navigator' test
    description: Tests pass (including the consolidated tombstone test).
  - id: cli-goals-md-deleted
    cmd: test -d docs/reference/cli && ! test -e docs/reference/cli/goals.md
    description: docs/reference/cli/goals.md is gone.
  - id: doc-index-no-goals-entry
    cmd: >
      test -f docs/_cli-commands.json && test -f docs/reference/cli/index.md &&
      \
        ! grep -qF '"goals"' docs/_cli-commands.json && \
        ! grep -q 'reference/cli/goals' docs/reference/cli/index.md
    description: Doc indices and CLI reference index do not link to a goals page.
  - id: tombstone-test-exists
    cmd: test -s tests/no-goals.test.ts
    description: The consolidated tombstone test exists at the repo root tests/ dir
      (or equivalent location agreed by the planner).
  - id: no-bare-goal-in-prose
    cmd: |
      # Allowlist: cli-redesign.md migration table (historical), the
      # tombstone test, and any acknowledged-historical entries flagged in
      # REFS.md as `keep`.
      hits=$(grep -rEn '\bgoal[A-Za-z]*\b' docs/ \
        --exclude='cli-redesign.md' \
        --exclude='no-goals.test.ts' \
        2>/dev/null || true)
      test -z "$hits" || { echo "$hits"; exit 1; }
    description: No word-boundary `goal` mentions in docs outside the cli-redesign
      historical migration table.
wbs:
  script: wbs/index.js
tags:
  - phase
  - docs
  - cleanup
  - wbs
---

# Phase 06 — Docs and Cleanup

## Scope

### 1. Delete `docs/reference/cli/goals.md`

The 59-line reference page for the deleted command. Delete the file outright.

### 2. Decide the fate of `docs/guides/articulate-your-goal.md`

This guide teaches the legacy goal pattern. Two options:
- **Delete.** Cleanest. The new task/seed/test paradigm has its own guides (to be written separately, not this playbook's job).
- **Rewrite as "Articulate Your Outcomes" using `checks:`.** The new mental model: tasks declare `checks:` that gate completion; the playbook-level `checks:` block gates the whole playbook. The guide becomes a "how to think about success criteria" guide, not a "how to write GOAL.md" guide.

Default: **delete**. The new model deserves a fresh guide written from scratch as part of the cli-redesign documentation effort, not a partial port of the old one.

### 3. Prune doc indices

`docs/_cli-commands.json`, `docs/_sources.json`, `docs/_ia.json` enumerate all CLI pages. Remove the `goals` entries. `docs/reference/cli/index.md` likely has a "Commands" list with a link to `goals.md` — remove that link.

### 4. WBS prose mentions

For every remaining doc file that contains a `\bgoal\b` token (per REFS.md), spawn one WBS leaf that decides per-file whether to:
- **Delete the mentioning paragraph** if it's specifically about the goal subsystem.
- **Rewrite to use `checks:` / `tasks` terminology** if the paragraph is about success criteria more broadly.
- **Mark `keep`** if it's an acknowledged historical reference (e.g. `cli-redesign.md`'s migration table, `editor-app-proposal.md`'s "future considerations" section).

The WBS template at `wbs/templates/per-doc/` materializes one TASK.md per file with the disposition baked in (read from REFS.md).

### 5. Consolidate the tombstone test

Phases 02–05 each produced negative-existence tests under `tests/no-goals/` (per-package or per-leaf). Consolidate them into a single `tests/no-goals.test.ts` (or `packages/core/tests/integration/no-goals.test.ts` — planner picks the location that matches existing test layout) with `describe.each` covering:
- Module non-existence (4 deleted source files).
- Schema rejection (`goals:`, `goalDefs:` raise unknown-field).
- CLI dispatch (no `goals` route; `--help` does not list it).
- Grep assertion (zero word-boundary `goal` hits in `packages/`, modulo allowlist).

This test is the permanent regression gate. Goal readmission becomes a CI failure.

## TDD discipline

This phase is mostly text editing, so the red-green ceremony is loose:

- For (1)–(3): the phase-level checks `cli-goals-md-deleted` and `doc-index-no-goals-entry` are themselves the acceptance test. No `01-red` leaf needed.
- For (4): each WBS leaf has its own implicit red (`grep \\bgoal\\b <file>` returns hits) → green (`grep` returns no hits, or only allowlisted lines).
- For (5): `01-red/` writes the consolidated test file; it fails because the per-leaf tests under `tests/no-goals/` still exist as separate files. `02-green/` deletes the per-leaf files and confirms the consolidated test passes.

## References

- REFS.md — the work list for the WBS.
- `/Users/minh/Documents/converge/docs/reference/cli/goals.md` — file 1 to delete.
- `/Users/minh/Documents/converge/docs/design/cli-redesign.md` — historical migration table; **do not edit**, it's a snapshot.

## Out of scope

- Writing new guides for the task/seed/test paradigm. Separate effort.
- Touching `docs/design/cli-redesign.md`. Historical record.
- Migrating downstream user docs (if any exist outside this repo).

## Open questions for the per-layer planner

- The exact location of the consolidated tombstone test — repo-root `tests/`, or `packages/core/tests/integration/`? Default: wherever the existing repo-wide integration tests live (probably `packages/core/tests/integration/`).
- Whether `docs/guides/articulate-your-goal.md` becomes a redirect stub (`# Moved\n\nThis guide is gone. See [task contracts](...)`) or is deleted outright. Default: deleted outright. Stubs rot.
- Whether to also prune mentions in CHANGELOG.md / RELEASES.md (not in current input list — survey first). If they exist with goal mentions, add a leaf.
