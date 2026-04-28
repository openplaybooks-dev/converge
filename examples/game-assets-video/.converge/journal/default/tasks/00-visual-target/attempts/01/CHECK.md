# Checks: 00-visual-target

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## visual-target-png-exists
**Description**: visual-target.png was generated
**Command**: `test -s assets/visual-target.png`

## assets-md-exists
**Description**: ASSETS.md was generated
**Command**: `test -s ASSETS.md`

## sprites-json-derived
**Description**: sprites.json was derived from ASSETS.md
**Command**: `test -s assets/sprites.json`