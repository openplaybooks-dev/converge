# Checks: 01-story/002-synopsis

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## synopsis-exists
**Description**: Synopsis file written and non-empty
**Command**: `test -s synopsis.md`

## synopsis-has-acts
**Description**: Synopsis covers all three acts
**Command**: `grep -E '^##? (Act|ACT) [1-3]' synopsis.md`