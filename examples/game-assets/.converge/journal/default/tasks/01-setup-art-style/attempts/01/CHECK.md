# Checks: 01-setup-art-style

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## sprites-json-exists
**Description**: sprites.json exists and is not empty
**Command**: `test -s assets/sprites.json`

## templates-exist
**Description**: Green screen templates exist
**Command**: `test -f .templates/green_128x128.png && test -f .templates/green_256x256.png`