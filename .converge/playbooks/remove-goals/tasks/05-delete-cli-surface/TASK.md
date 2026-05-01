---
id: 05-delete-cli-surface
title: Delete commands-goals.ts; remove `goals` from dispatch (no redirect)
description: |
  Final code-deletion phase. The CLI loses its `goals` subcommand entirely:
  `commands-goals.ts` (541 lines) is deleted, the `goals` case is removed
  from `main.ts`'s dispatch switch, the help text loses its goals entry,
  and `commands.ts` (the command registry) drops the `goals` declaration.

  No redirect. `converge goals` falls through to the unknown-command
  handler and exits non-zero. Users on old habits get a clear "unknown
  command" message; the migration story for power users is the
  cli-redesign migration table.

  If cli-redesign Phase 06-migration has already shipped a `goals → build`
  redirect entry in `migration-redirects.ts`, this phase removes that row
  too.

dependencies:
  - 04-delete-runtime-and-planner

inputs:
  - "packages/cli/src/commands-goals.ts"
  - "packages/cli/src/main.ts"
  - "packages/cli/src/commands.ts"
  - "packages/cli/src/help.ts"

outputs:
  - "packages/cli/src/main.ts"
  - "packages/cli/src/commands.ts"
  - "packages/cli/src/help.ts"

checks:
  - id: typecheck-green
    cmd: pnpm -r typecheck
    description: Typecheck green.
  - id: tests-green
    cmd: pnpm -r test
    description: Tests pass.
  - id: built-cli-exists
    cmd: pnpm --filter @converge/cli build && test -x packages/cli/dist/index.js
    description: CLI builds end-to-end.
  - id: commands-goals-deleted
    cmd: "! test -e packages/cli/src/commands-goals.ts"
    description: commands-goals.ts is gone.
  - id: no-goal-token-in-cli-src
    cmd: |
      hits=$(grep -rEn '\bgoal[A-Za-z]*\b' packages/cli/src/ 2>/dev/null || true)
      test -z "$hits" || { echo "$hits"; exit 1; }
    description: No word-boundary `goal` references anywhere under packages/cli/src/.
  - id: goals-command-unknown
    cmd: |
      out=$(packages/cli/dist/index.js goals 2>&1); rc=$?
      test $rc -ne 0
      echo "$out" | grep -qiE 'unknown|unrecognized'
    description: '`converge goals` exits non-zero with an unknown-command message (not a redirect).'
  - id: help-omits-goals
    cmd: "! packages/cli/dist/index.js --help 2>&1 | grep -qE '^[[:space:]]+goals\\b'"
    description: '`converge --help` does not list `goals` as an available command.'

tags:
  - phase
  - cli
  - delete
---

# Phase 05 — Delete CLI Surface

## Scope

### 1. Delete `commands-goals.ts` (541 lines)

The implementation of `converge goals` — discovers GOAL.md files, evaluates metrics, optionally invokes the now-deleted `goal-planner` for AI-driven remediation. Delete the file outright.

### 2. Remove `goals` from `main.ts` dispatch

In `packages/cli/src/main.ts` around line 1154, the dispatch switch has:

```ts
case "goals": {
  await evaluateCommand({ ... });
  break;
}
```

Remove the case entirely. Do **not** add a redirect or "command moved" message — the user explicitly chose full deletion. The default fall-through prints an "unknown command" message and exits non-zero, which is the desired UX.

Also remove the `import { evaluateCommand } from "./commands-goals"` line at the top of `main.ts` (if phase 02 missed it).

### 3. Remove from `commands.ts` registry

`packages/cli/src/commands.ts` lists every command name and its help summary. Drop the `goals` entry. The help text now reflects only the surviving commands.

### 4. Update `help.ts`

`packages/cli/src/help.ts` likely contains a goals section in the long-form help (`converge help goals` or `converge --help` with extended verbose mode). Remove that section.

### 5. If cli-redesign already shipped, drop the redirect row

If `packages/cli/src/migration-redirects.ts` exists and contains a `goals → build` row, remove that row. The redirect is incompatible with full deletion — having `converge goals` print "use `build` instead" implies a relationship between `goals` and `build` that no longer exists semantically.

## TDD discipline

- **`01-red/`**: `tests/no-goals/cli.test.ts`:
  1. `expect(fs.existsSync('packages/cli/src/commands-goals.ts')).toBe(false)`
  2. Spawn the built CLI with `goals` argument; expect non-zero exit and stderr matching `/unknown|unrecognized/i`.
  3. `expect(execHelpOutput).not.toMatch(/^[\s]+goals\b/m)` — the command list in `--help` does not include `goals`.
  4. Grep assertion: zero hits for `\bgoal\b` under `packages/cli/src/`.

  All four fail today.

- **`02-green/`**: perform the deletions and edits above until all four pass.

## References

- `/Users/minh/Documents/converge/packages/cli/src/commands-goals.ts` — the file to delete.
- `/Users/minh/Documents/converge/packages/cli/src/main.ts` line 1154 — the dispatch case to remove.
- REFS.md — should mark `commands-goals.ts` as `delete` and `main.ts`, `commands.ts`, `help.ts` as `strip`.

## Out of scope

- Documentation. Phase 06.
- Anything outside `packages/cli/src/`.

## Open questions for the per-layer planner

- Whether to consolidate the four `01-red` assertions into one test file or split them. Default: one `tests/no-goals/cli.test.ts` — keeps phase-level regression coverage in one place.
- Whether the unknown-command message should be customized to mention "the goal concept was removed; see [docs link]" *without* being a redirect. Default: no — keep the standard unknown-command UX. Discoverability is the docs' job, not the dispatcher's.
