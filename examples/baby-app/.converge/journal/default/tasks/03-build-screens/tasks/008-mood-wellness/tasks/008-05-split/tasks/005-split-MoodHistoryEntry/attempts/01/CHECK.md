# Checks: 03-build-screens/008-mood-wellness/008-05-split/005-split-MoodHistoryEntry

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/mood_wellness/widgets/mood_history_entry.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/mood_wellness/widgets/mood_history_entry.dart`