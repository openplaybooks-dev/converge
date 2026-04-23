# Checks: 03-build-screens/009-settings/009-05-split/002-split-AlertSettingsCard

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/settings/widgets/alert_settings_card.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/settings/widgets/alert_settings_card.dart`