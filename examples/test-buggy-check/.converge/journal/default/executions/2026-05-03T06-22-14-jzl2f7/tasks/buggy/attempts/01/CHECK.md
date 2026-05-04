# Checks: buggy

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## wrong-check
**Description**: Deliberately wrong check — will be relaxed by framework
**Command**: `test -f REPORT.md && grep -q "analysis complete" REPORT.md`

## real-check
**Description**: REPORT.md exists with correct content
**Command**: `test -f REPORT.md && grep -q "analysis complete" REPORT.md`

## relaxation-gate
**Description**: Attempt 2 TASK.md was relaxed (proves buggy-check relaxer ran)
**Command**: `find .converge/journal -path '*/attempts/02/TASK.md' 2>/dev/null | head -1 | xargs -I {} grep -q 'REPORT.md' {}`