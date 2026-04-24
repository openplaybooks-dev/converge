# Checks: 03-build-screens/007-edit-safe-zone/007-06-lift/002-lift-AddressField

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/address_field.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `flutter analyze lib/widgets/address_field.dart`