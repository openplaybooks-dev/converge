# Checks: 01-brand/003-config-rename

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## no-harness-in-config
**Description**: No harness references in config files
**Command**: `! grep -ri 'harness' --include='*.json' --include='*.yml' --include='*.yaml' packages/ 2>/dev/null | grep -v node_modules | grep -v CHANGELOG | grep -v '.converge/' | grep -v package-lock | head -1`