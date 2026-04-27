# Checks: 02-port-data-layer/003-copy-supporting-libs

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## supporting-libs-present
**Description**: Required supporting libs exist
**Command**: `for f in use-converge-events use-view-mode watcher-singleton schedule-parser run-supervisor ring-buffer session-correlator; do test -f packages/studio/src/lib/$f.ts || exit 1; done`