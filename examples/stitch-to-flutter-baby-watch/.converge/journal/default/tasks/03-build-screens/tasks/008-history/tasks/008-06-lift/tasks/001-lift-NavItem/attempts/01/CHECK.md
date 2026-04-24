# Checks: 03-build-screens/008-history/008-06-lift/001-lift-NavItem

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/nav_item.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `flutter analyze lib/widgets/nav_item.dart`