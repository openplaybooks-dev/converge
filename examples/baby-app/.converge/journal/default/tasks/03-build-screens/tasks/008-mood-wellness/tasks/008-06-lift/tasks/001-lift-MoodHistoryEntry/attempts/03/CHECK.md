# Checks: 03-build-screens/008-mood-wellness/008-06-lift/001-lift-MoodHistoryEntry

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Shared widget file exists
**Command**: `test -f lib/widgets/mood_history_entry.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/widgets/mood_history_entry.dart`