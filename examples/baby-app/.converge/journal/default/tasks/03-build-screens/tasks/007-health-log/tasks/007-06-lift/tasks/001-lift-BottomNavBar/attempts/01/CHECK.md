# Checks: 03-build-screens/007-health-log/007-06-lift/001-lift-BottomNavBar

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/bottom_nav_bar.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/bottom_nav_bar.dart`