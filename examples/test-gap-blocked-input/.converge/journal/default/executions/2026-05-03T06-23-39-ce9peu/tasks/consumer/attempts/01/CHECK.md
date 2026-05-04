# Checks: consumer

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## consumed-output
**Description**: CONSUMED_OUTPUT.txt exists with chained content
**Command**: `test -f CONSUMED_OUTPUT.txt && grep -q "producer-ok-consumed" CONSUMED_OUTPUT.txt`

## producer-retry-gate
**Description**: Producer ran at least twice (proves DependencyBackoffStrategy re-ran it)
**Command**: `find .converge/journal -path '*/producer/attempts/02/CHECK.result.md' 2>/dev/null | grep -q CHECK`