# Checks: 03-build-screens/005-mindfulness/005-06-lift/002-lift-MoodBanner

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/mood_banner.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/mood_banner.dart`