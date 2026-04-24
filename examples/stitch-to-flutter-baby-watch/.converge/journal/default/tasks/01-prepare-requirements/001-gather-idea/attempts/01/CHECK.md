# Checks: 01-prepare-requirements/001-gather-idea

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## idea-md-exists
**Description**: idea.md exists
**Command**: `test -f idea.md`

## idea-has-purpose
**Description**: idea.md has purpose section
**Command**: `grep -q "## Purpose" idea.md`