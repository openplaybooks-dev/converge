# Checks: 02-docs/004-core-readme

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## core-readme-exists
**Description**: Core README exists
**Command**: `test -f packages/core/README.md`

## core-readme-has-api
**Description**: Core README has API or usage documentation
**Command**: `grep -q 'API\|Configuration\|Usage\|Install' packages/core/README.md`