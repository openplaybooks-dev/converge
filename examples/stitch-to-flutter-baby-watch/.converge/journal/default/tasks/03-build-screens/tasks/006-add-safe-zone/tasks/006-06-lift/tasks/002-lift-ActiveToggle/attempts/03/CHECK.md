# Checks: 03-build-screens/006-add-safe-zone/006-06-lift/002-lift-ActiveToggle

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/active_toggle.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/active_toggle.dart`