# Checks: 01-clone-and-rename/003-license-notice

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## upstream-license-preserved
**Description**: LICENSE.upstream contains MIT
**Command**: `test -f packages/studio/LICENSE.upstream && grep -qi 'MIT' packages/studio/LICENSE.upstream`

## notice-attribution
**Description**: NOTICE attributes mission-control with the SHA
**Command**: `test -f packages/studio/NOTICE && grep -qi 'mission-control' packages/studio/NOTICE && grep -q 'a020d1b7' packages/studio/NOTICE`