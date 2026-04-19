# Checks: 03-build-screens/001-home/001-05-split/001-split-GreetingHeader

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/home/_widgets/greeting_header.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/home/_widgets/greeting_header.dart`