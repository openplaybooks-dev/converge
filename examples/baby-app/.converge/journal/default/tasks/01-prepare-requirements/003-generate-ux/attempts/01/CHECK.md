# Checks: 01-prepare-requirements/003-generate-ux

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## ux-md-exists
**Description**: UX.md exists
**Command**: `test -f .stitch/UX.md`

## ux-has-screens
**Description**: UX.md has screens section
**Command**: `grep -qE "##.*Screens" .stitch/UX.md`

## ux-matches-idea
**Description**: UX.md references the app name from PRD.md
**Command**: `first=$(awk '/^## Overview/{found=1; next} found && /^[^ #]/{print $1; exit}' PRD.md); grep -qi "$first" .stitch/UX.md`