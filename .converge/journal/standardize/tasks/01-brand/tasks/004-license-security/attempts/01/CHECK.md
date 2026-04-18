# Checks: 01-brand/004-license-security

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## no-harness-in-legal
**Description**: No harness references in legal files
**Command**: `test -z "$(grep -i 'harness' SECURITY.md LICENSE 2>/dev/null | grep -v '.converge/')"`