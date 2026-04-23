# Checks: 03-build-screens/009-settings/009-06-lift/004-lift-MuteNotificationsRow

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/mute_notifications_row.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/`