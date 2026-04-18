# Checks: 01-brand/002-docs-rename

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## no-harness-in-md
**Description**: No harness references in .md documentation files
**Command**: `test -z "$(grep -ri 'harness' --include='*.md' packages/ docs/ README.md 2>/dev/null | grep -v node_modules | grep -v CHANGELOG | grep -v '.converge/' | grep -v auto-verify | head -1)"`