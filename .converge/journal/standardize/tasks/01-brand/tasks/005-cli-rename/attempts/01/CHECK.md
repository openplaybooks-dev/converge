# Checks: 01-brand/005-cli-rename

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## no-harness-in-cli
**Description**: No harness references in CLI source
**Command**: `test -z "$(grep -i 'harness' packages/core/src/cli/*.ts 2>/dev/null | grep -v auto-verify | grep -v '.converge/')"`