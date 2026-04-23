# Checks: 03-build-screens/012-invite-accept/012-05-split/003-split-ActionButtons

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/invite_accept/widgets/action_buttons.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/invite_accept/widgets/action_buttons.dart`