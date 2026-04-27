# Checks: 02-port-data-layer/004-copy-api-routes

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## api-routes-all-copied
**Description**: All 7 converge-native API route trees exist
**Command**: `for d in playbooks runs run watch events search settings; do test -d packages/studio/src/app/api/$d || exit 1; done`