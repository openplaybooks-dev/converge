# Checks: 03-build-screens/009-settings/009-06-lift/005-lift-GeneralSettingsSection

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/general_settings_section.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/general_settings_section.dart`