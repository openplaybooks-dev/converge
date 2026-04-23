# Checks: 03-build-screens/007-edit-safe-zone/007-05-split/004-split-RadiusSelector

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/edit_safe_zone/widgets/radius_selector.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/edit_safe_zone/widgets/radius_selector.dart`