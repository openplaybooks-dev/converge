# Checks: 03-build-screens/006-exercise-detail/006-06-lift/003-lift-BenefitsCard

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/benefits_card.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/benefits_card.dart`