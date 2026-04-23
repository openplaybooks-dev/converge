# Checks: 03-build-screens/011-onboarding/011-05-split/002-split-PageIndicator

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/onboarding/widgets/page_indicator.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `flutter analyze lib/screens/onboarding/widgets/page_indicator.dart`