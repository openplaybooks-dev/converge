# Needs: 03-build-screens/009-education/009-03-convert

## Description

Convert constrained HTML design to Flutter widgets for Education using stitch-flutter

## Inputs

- `.stitch/designs/education/design.html`
- `.stitch/designs/education/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/education/education_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
