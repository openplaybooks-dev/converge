# Checks: 04-oss/001-community-health

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## coc-exists
**Description**: Code of Conduct exists
**Command**: `test -f CODE_OF_CONDUCT.md`

## issue-templates-exist
**Description**: Issue templates directory exists
**Command**: `test -d .github/ISSUE_TEMPLATE`

## pr-template-exists
**Description**: PR template exists
**Command**: `test -f .github/PULL_REQUEST_TEMPLATE.md`