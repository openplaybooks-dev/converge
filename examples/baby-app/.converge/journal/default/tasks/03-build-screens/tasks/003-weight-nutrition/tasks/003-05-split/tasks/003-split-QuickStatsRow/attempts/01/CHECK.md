# Checks: 03-build-screens/003-weight-nutrition/003-05-split/003-split-QuickStatsRow

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/weight_nutrition/widgets/quick_stats_row.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/weight_nutrition/widgets/quick_stats_row.dart`