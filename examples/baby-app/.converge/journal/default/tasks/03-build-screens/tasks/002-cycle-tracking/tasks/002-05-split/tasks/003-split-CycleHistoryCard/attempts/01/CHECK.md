# Checks: 03-build-screens/002-cycle-tracking/002-05-split/003-split-CycleHistoryCard

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/cycle_tracking/widgets/cycle_history_card.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/cycle_tracking/widgets/cycle_history_card.dart`