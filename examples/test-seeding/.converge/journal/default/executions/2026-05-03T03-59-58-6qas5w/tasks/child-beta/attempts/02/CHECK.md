# Checks: child-beta

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## beta-output
**Description**: beta.txt exists with correct content
**Command**: `test -f beta.txt && grep -q "beta" beta.txt`