# Checks: 09-concepts/003-self-correction

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/concepts/self-correction.md`

## covers-learn-md
**Description**: covers LEARN.md
**Command**: `grep -q 'LEARN\.md' docs/concepts/self-correction.md`

## contrasts-retry-and-hope
**Description**: explains how this differs from retry-and-hope
**Command**: `grep -qiE 'retry|context|feedback' docs/concepts/self-correction.md`