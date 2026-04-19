# Checks: 03-build-screens/005-mindfulness/005-05-split/005-split-BottomNavBar

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/mindfulness/widgets/bottom_nav_bar.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/mindfulness/widgets/bottom_nav_bar.dart`