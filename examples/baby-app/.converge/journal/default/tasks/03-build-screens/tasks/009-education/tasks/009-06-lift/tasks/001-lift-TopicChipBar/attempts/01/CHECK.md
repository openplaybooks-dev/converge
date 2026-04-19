# Checks: 03-build-screens/009-education/009-06-lift/001-lift-TopicChipBar

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/topic_chip_bar.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/topic_chip_bar.dart`