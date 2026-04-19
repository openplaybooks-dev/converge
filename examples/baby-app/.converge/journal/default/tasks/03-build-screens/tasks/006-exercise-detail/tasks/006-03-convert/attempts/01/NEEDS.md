# Needs: 03-build-screens/006-exercise-detail/006-03-convert

## Description

Convert constrained HTML design to Flutter widgets for Exercise Detail using stitch-flutter

## Inputs

- `.stitch/designs/exercise-detail/design.html`
- `.stitch/designs/exercise-detail/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/exercise_detail/exercise_detail_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
