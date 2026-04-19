# Checks: 03-build-screens/004-pregnancy-progress/004-06-lift/002-lift-ExerciseGuideCard

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/exercise_guide_card.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/exercise_guide_card.dart`