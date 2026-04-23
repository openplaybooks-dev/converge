# Checks: 01-prepare-requirements/002-generate-prd

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## prd-exists
**Description**: PRD.md exists
**Command**: `test -f PRD.md`

## prd-has-sections
**Description**: PRD.md has expected sections
**Command**: `grep -qE "## (Overview|Features|Requirements)" PRD.md`

## prd-matches-idea
**Description**: PRD.md references the app name from idea.md
**Command**: `first=$(head -1 idea.md | sed 's/^#* *//' | awk '{print $1}'); grep -qi "$first" PRD.md`