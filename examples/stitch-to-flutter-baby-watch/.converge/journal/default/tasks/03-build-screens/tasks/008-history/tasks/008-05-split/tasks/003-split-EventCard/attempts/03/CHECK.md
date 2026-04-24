# Checks: 03-build-screens/008-history/008-05-split/003-split-EventCard

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/widgets/event_card.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/event_card.dart`