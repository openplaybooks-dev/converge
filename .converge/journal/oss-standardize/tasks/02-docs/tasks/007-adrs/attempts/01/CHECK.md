# Checks: 02-docs/007-adrs

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## adr-dir-exists
**Description**: ADR directory exists
**Command**: `test -d docs/adr`

## adr-index-exists
**Description**: ADR index exists
**Command**: `test -f docs/adr/README.md`