# Checks: 05-run-supervisor/001-supervisor-module

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## module-exists
**Description**: Supervisor module exists
**Command**: `test -f packages/converge-studio/src/lib/run-supervisor.ts && test -f packages/converge-studio/src/lib/ring-buffer.ts`

## typecheck
**Description**: Module typechecks
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`

## api-surface
**Description**: Exposes startRun, getRun, listRuns
**Command**: `grep -q 'export function startRun\|export const startRun' packages/converge-studio/src/lib/run-supervisor.ts && grep -q 'export function getRun\|export const getRun' packages/converge-studio/src/lib/run-supervisor.ts && grep -q 'export function listRuns\|export const listRuns' packages/converge-studio/src/lib/run-supervisor.ts`