# Checks: 03-build-screens/004-pregnancy-progress/004-05-split/002-split-BodyChangesCard

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/pregnancy_progress/widgets/body_changes_card.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/pregnancy_progress/widgets/body_changes_card.dart`