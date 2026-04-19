# Needs: 03-build-screens/004-pregnancy-progress/004-03-convert

## Description

Convert constrained HTML design to Flutter widgets for Pregnancy Progress using stitch-flutter

## Inputs

- `.stitch/designs/pregnancy-progress/design.html`
- `.stitch/designs/pregnancy-progress/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/pregnancy_progress/pregnancy_progress_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
