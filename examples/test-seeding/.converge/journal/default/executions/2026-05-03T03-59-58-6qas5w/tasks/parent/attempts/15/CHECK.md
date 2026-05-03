# Checks: parent

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## all-outputs
**Description**: beta.txt and grand.txt exist (created by level 2 and level 3 children)
**Command**: `test -f beta.txt && test -f grand.txt`