# Checks: 03-build-screens/009-settings/009-05-split/005-split-GeneralSettingsSection

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/settings/widgets/general_settings_section.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/settings/widgets/general_settings_section.dart`