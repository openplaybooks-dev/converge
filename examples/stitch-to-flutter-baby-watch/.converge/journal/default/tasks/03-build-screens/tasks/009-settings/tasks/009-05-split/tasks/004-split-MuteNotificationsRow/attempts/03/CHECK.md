# Checks: 03-build-screens/009-settings/009-05-split/004-split-MuteNotificationsRow

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/settings/widgets/mute_notifications_row.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart format --set-exit-if-changed lib/screens/settings/widgets/mute_notifications_row.dart; test $? -lt 2`