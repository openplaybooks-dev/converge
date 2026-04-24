# Checks: 03-build-screens/010-guardians/010-05-split/001-split-GuardianCard

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/guardians/widgets/guardian_card.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/guardians/widgets/guardian_card.dart`