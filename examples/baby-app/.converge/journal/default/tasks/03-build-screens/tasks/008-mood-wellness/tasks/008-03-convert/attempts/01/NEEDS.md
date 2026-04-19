# Needs: 03-build-screens/008-mood-wellness/008-03-convert

## Description

Convert constrained HTML design to Flutter widgets for Mood & Wellness using stitch-flutter

## Inputs

- `.stitch/designs/mood-wellness/design.html`
- `.stitch/designs/mood-wellness/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/mood_wellness/mood_wellness_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
