# Checks: grandchild

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## grand-output
**Description**: grand.txt exists with correct content
**Command**: `test -f grand.txt && grep -q "grand" grand.txt`