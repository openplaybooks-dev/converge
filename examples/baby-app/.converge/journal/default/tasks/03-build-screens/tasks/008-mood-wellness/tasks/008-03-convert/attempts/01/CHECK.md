# Checks: 03-build-screens/008-mood-wellness/008-03-convert

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## screen-exists
**Description**: Screen widget file exists
**Command**: `test -f lib/screens/mood_wellness/mood_wellness_screen.dart`

## dart-valid
**Description**: Dart analysis passes
**Command**: `dart analyze lib/screens/mood_wellness/mood_wellness_screen.dart`

## uses-theme
**Description**: Uses Theme.of(context) for styling
**Command**: `grep -q 'Theme.of(context)' lib/screens/mood_wellness/mood_wellness_screen.dart`

## no-hardcoded-colors
**Description**: No hardcoded colors — uses colorScheme
**Command**: `! grep -qE 'Color\(0x|Colors\.' lib/screens/mood_wellness/mood_wellness_screen.dart`