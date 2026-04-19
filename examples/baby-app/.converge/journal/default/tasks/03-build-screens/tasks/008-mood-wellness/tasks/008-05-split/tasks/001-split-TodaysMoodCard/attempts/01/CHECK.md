# Checks: 03-build-screens/008-mood-wellness/008-05-split/001-split-TodaysMoodCard

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## widget-exists
**Description**: Widget file exists
**Command**: `test -f lib/screens/mood_wellness/widgets/todays_mood_card.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/mood_wellness/widgets/todays_mood_card.dart`