# Checks: 01-clone-and-rename/001-clone-mc

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## studio-dir-populated
**Description**: packages/studio/ has src/app and package.json
**Command**: `test -d packages/studio/src/app && test -f packages/studio/package.json`

## upstream-sha-pinned
**Description**: UPSTREAM_SHA matches the pin
**Command**: `grep -q '^a020d1b7d045e0e09616663ffb39963f432a3f4c' packages/studio/UPSTREAM_SHA`

## dot-git-removed
**Description**: .git directory removed
**Command**: `test ! -d packages/studio/.git`