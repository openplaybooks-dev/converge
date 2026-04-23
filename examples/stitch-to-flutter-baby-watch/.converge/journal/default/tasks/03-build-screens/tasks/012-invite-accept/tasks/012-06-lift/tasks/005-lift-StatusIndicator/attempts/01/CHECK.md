# Checks: 03-build-screens/012-invite-accept/012-06-lift/005-lift-StatusIndicator

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/status_indicator.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/status_indicator.dart`