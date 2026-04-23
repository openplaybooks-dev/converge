# Checks: 03-build-screens/007-edit-safe-zone/007-06-lift/003-lift-ActiveToggle

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/active_toggle.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/active_toggle.dart`