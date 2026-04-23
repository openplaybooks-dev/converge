# Checks: 06-wire-screens/001-connect-providers

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## screens-use-consumer-widget
**Description**: At least 3 screens use ConsumerWidget
**Command**: `grep -r 'ConsumerWidget' lib/screens/ --include='*.dart' | wc -l | awk '{if ($1 >= 3) exit 0; exit 1}'`

## screens-watch-providers
**Description**: At least 3 screens use ref.watch to read providers
**Command**: `grep -r 'ref.watch' lib/screens/ --include='*.dart' | wc -l | awk '{if ($1 >= 3) exit 0; exit 1}'`

## dart-analysis-valid
**Description**: All code passes analysis
**Command**: `dart analyze lib/`