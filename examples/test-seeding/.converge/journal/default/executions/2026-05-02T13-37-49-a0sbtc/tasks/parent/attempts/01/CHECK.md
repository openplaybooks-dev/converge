# Checks: parent

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## all-outputs
**Description**: All three output files exist
**Command**: `test -f alpha.txt && test -f beta.txt && test -f gamma.txt`