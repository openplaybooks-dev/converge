# Checks: 03-dx/001-getting-started

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## guide-exists
**Description**: Getting started guide exists
**Command**: `test -f docs/getting-started.md`

## guide-has-sections
**Description**: Guide has at least 3 sections
**Command**: `grep -c '^##' docs/getting-started.md | xargs test 3 -le`