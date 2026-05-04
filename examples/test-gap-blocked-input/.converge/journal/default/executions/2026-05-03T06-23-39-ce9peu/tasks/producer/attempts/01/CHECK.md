# Checks: producer

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## correct-output
**Description**: INPUT_FILE.txt exists with correct content
**Command**: `test -f INPUT_FILE.txt && grep -q "producer-ok" INPUT_FILE.txt`