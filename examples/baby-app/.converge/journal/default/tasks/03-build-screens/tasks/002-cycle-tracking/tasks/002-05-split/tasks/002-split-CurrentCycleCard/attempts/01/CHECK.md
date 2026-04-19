# Checks: 03-build-screens/002-cycle-tracking/002-05-split/002-split-CurrentCycleCard

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/cycle_tracking/widgets/current_cycle_card.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/cycle_tracking/widgets/current_cycle_card.dart`