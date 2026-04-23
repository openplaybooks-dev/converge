# Checks: 03-build-screens/006-add-safe-zone/006-05-split/002-split-SafeZoneFormField

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/add_safe_zone/widgets/safe_zone_form_field.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `flutter analyze lib/screens/add_safe_zone/widgets/safe_zone_form_field.dart`