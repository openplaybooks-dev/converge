# Checks: two-phase

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## phase-one
**Description**: STEP1.txt exists
**Command**: `test -f STEP1.txt && grep -q "phase-1-done" STEP1.txt`

## phase-two
**Description**: STEP2.txt exists
**Command**: `test -f STEP2.txt && grep -q "phase-2-done" STEP2.txt`

## second-attempt-gate
**Description**: Attempt 1 archive exists (proves we are on attempt 2+)
**Command**: `find .converge/journal -path '*/attempts/01/FEEDBACK.md' 2>/dev/null | grep -q FEEDBACK`