# Checks: 05-run-supervisor/003-session-correlation

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## correlator-exists
**Description**: Correlator module exists
**Command**: `test -f packages/converge-studio/src/lib/session-correlator.ts`

## typecheck
**Description**: Module typechecks
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`

## integrated
**Description**: run-supervisor wires the correlator
**Command**: `grep -q 'session-correlator\|attachCorrelator' packages/converge-studio/src/lib/run-supervisor.ts`