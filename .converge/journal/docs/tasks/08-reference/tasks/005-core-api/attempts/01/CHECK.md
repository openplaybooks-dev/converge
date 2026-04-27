# Checks: 08-reference/005-core-api

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/reference/core-api.md`

## lists-exports
**Description**: lists at least 8 exported symbols
**Command**: `test $(grep -cE '^###\s+|`[A-Z][a-zA-Z]+`' docs/reference/core-api.md) -ge 8`

## covers-exports-map
**Description**: covers the package exports map (subpaths)
**Command**: `grep -qE '@converge/core|exports' docs/reference/core-api.md`