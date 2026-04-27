# Checks: 08-reference/001-cli-index

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/reference/cli/index.md`

## lists-commands
**Description**: lists at least 8 commands
**Command**: `test $(grep -cE '^\*?\s*\[?\s*`?converge\s+\w+' docs/reference/cli/index.md) -ge 8`