# Checks: 03-build-screens/010-guardians/010-06-lift/001-lift-GuardianCard

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/guardian_card.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `flutter analyze --no-pub lib/widgets/guardian_card.dart`