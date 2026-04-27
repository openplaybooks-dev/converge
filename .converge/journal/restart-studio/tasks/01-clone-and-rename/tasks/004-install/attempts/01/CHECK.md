# Checks: 01-clone-and-rename/004-install

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## install-success
**Description**: packages/studio has node_modules linked or symlinked
**Command**: `test -e packages/studio/node_modules || test -d node_modules/@converge/studio`