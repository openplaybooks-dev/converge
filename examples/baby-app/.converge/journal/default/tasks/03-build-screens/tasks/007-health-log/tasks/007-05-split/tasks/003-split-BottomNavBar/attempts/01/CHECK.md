# Checks: 03-build-screens/007-health-log/007-05-split/003-split-BottomNavBar

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/health_log/widgets/bottom_nav_bar.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/health_log/widgets/bottom_nav_bar.dart`