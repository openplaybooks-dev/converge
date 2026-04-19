# Checks: 03-build-screens/011-settings/011-05-split/003-split-NotificationsSection

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/settings/widgets/notifications_section.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/settings/widgets/notifications_section.dart`