# Checks: 03-build-screens/011-onboarding/011-06-lift/002-lift-PageIndicator

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/page_indicator.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `flutter analyze lib/widgets/page_indicator.dart`