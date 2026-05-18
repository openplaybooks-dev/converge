# Checks Migration Report: 03f — Reusable checks API

**Task:** 03-reusable-checks-api/03f-checks-migration
**Date:** 2026-05-02
**Scope:** All live playbooks (excluding dbt-paradigm per self-host safety) + playbook-level and task-level checks

## Test Definitions Created

Four reusable `.test.md` definitions in `.converge/playbooks/dbt-paradigm/tests/`:

| File | Description | Args |
|---|---|---|
| `typecheck.test.md` | TypeScript typecheck passes | `pnpm_args` (default: `-r`), `guard` (default: `""`) |
| `tests-green.test.md` | Test suite passes | `pnpm_args` (default: `-r`), `guard` (default: `""`) |
| `file-exists.test.md` | File/directory exists | `path` (required), `test_flag` (default: `-f`) |
| `no-pattern.test.md` | Pattern absent from file | `pattern` (required), `path` (required), `grep_args` (default: `-q`) |

## Migration Summary

| Playbook | Playbook-level checks migrated | Task-level checks migrated | Checks left inline |
|---|---|---|---|
| cli-redesign | 4 (all) | 0 (compile doesn't read task-level) | 0 |
| remove-goals | 4 of 7 (3 kept inline) | 12 (typecheck + tests-green × 6 tasks) | 5 (compound/unique) |
| oss-standardize | 0 | 0 | 3 (complex grep, compound) |
| cli-to-core-extraction | 0 | 0 | 9 (unique architecture enforcement) |
| Other 6 playbooks | 0 (no repeated checks) | 0 | 0 |

## cli-redesign — Playbook-level

| Before (inline) | After (test ref) |
|---|---|
| `typecheck-green`: `pnpm --filter @openplaybooks/converge-core --filter @openplaybooks/converge typecheck` | `type: test, name: typecheck, args: { pnpm_args: "--filter @openplaybooks/converge-core --filter @openplaybooks/converge" }` |
| `tests-green`: `pnpm --filter @openplaybooks/converge-core --filter @openplaybooks/converge test` | `type: test, name: tests-green, args: { pnpm_args: "--filter @openplaybooks/converge-core --filter @openplaybooks/converge" }` |
| `spec-doc-present`: `test -s docs/design/cli-redesign.md` | `type: test, name: file-exists, args: { path: "docs/design/cli-redesign.md", test_flag: "-s" }` |
| `built-cli-exists`: `test -x packages/cli/dist/index.js` | `type: test, name: file-exists, args: { path: "packages/cli/dist/index.js", test_flag: "-x" }` |

## remove-goals — Playbook-level

| Before (inline) | After (test ref) |
|---|---|
| `typecheck-green`: `pnpm -r typecheck` | `type: test, name: typecheck` (uses defaults) |
| `tests-green`: `pnpm -r test` | `type: test, name: tests-green` (uses defaults) |
| `built-cli-exists`: `test -x packages/cli/dist/index.js` | `type: test, name: file-exists, args: { path: "packages/cli/dist/index.js", test_flag: "-x" }` |
| `no-goal-md-frontmatter-field`: `! grep -nE '...' packages/core/src/config/task-md-definition.ts` | `type: test, name: no-pattern, args: { pattern: "^[[:space:]]*(goals\|goalDefs\|goal-defs):", path: "packages/core/src/config/task-md-definition.ts", grep_args: "-nE" }` |

**Kept inline:** `no-goal-source-files` (compound `! ls` across multiple paths), `no-goal-md-artifacts-in-examples` (compound `! find ... | grep`), `no-goals-cli-route` (multi-line script with variable capture).

## remove-goals — Task-level

Each of the 6 task TASK.md files (`01-survey-and-fence` through `06-docs-and-cleanup`) had `typecheck-green` and `tests-green` checks with `test -f package.json &&` guard prefixes. All 12 migrated to `type: test` references using the `guard` arg.

| Task | typecheck pnpm_args | tests-green pnpm_args |
|---|---|---|
| 01-survey-and-fence | `-r --filter '!@openplaybooks/studio' --filter '!@openplaybooks/converge-provider-benchmark'` | `-r --filter '@openplaybooks/converge'` |
| 02-strip-callsites | `--filter @openplaybooks/converge-core --filter @openplaybooks/navigator` | `--filter @openplaybooks/navigator` |
| 03-06 (4 tasks) | `-r --filter './packages/core' --filter './packages/cli' --filter './packages/navigator'` | same |

Task-specific checks (`parse-goal-deleted`, `goaldef-interface-gone`, `no-goal-token-in-config`, etc.) kept inline as they are unique to their task.

## oss-standardize — No migration

All 3 playbook-level checks are complex one-offs:
- `no-harness-refs`: multi-line `test -z "$(grep -ri ... | grep -v ... | grep -v ...)"` 
- `no-crew-refs`: similar multi-exclusion grep
- `readme-exists`: compound `test -f X && head -1 X | grep -qi Y`

The task-level `test -f <path>` checks (55+ instances across 27 task files) follow the `file-exists` pattern but are not read by `converge compile` (they live in `tasks/*/tasks/*/TASK.md`). Migrating them would require modifying the converge runtime's task discovery path — deferred to a follow-up.

## cli-to-core-extraction — No migration

All 9 playbook-level checks are unique architecture enforcement with complex shell:
- `core-no-console`, `core-no-process-exit`, `core-no-chalk`, `core-no-global-back-channels`: `find | xargs grep -l` with specific paths
- `core-typecheck`, `cli-typecheck`: `cd <pkg> && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`
- `cli-builds`: `pnpm -F @openplaybooks/converge build 2>&1 | tail -5`
- `cli-smoke`: CLI invocation smoke
- `cli-does-not-own-runner`: compound `! test -f` across multiple paths

## Verification

- All 11 live playbooks compile successfully (`converge compile --dir <path>` exits 0)
- Zero pre-existing inline checks were broken
- `dbt-paradigm` playbook excluded per self-host safety rule
