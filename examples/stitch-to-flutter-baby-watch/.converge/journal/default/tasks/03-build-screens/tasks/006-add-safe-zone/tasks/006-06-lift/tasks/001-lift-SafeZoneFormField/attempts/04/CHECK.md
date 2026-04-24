# Checks: 03-build-screens/006-add-safe-zone/006-06-lift/001-lift-SafeZoneFormField

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/safe_zone_form_field.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `flutter analyze lib/widgets/safe_zone_form_field.dart`