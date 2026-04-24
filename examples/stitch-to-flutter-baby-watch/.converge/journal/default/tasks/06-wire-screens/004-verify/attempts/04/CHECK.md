# Checks: 06-wire-screens/004-verify

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## no-empty-handlers
**Description**: No empty/comment-only handlers in any screen or widget file
**Command**: `node .converge/playbooks/default/tasks/06-wire-screens/004-verify/check-all-handlers.mjs`

## dart-analysis-valid
**Description**: Full Dart analysis passes
**Command**: `dart analyze lib/ --no-fatal-warnings`