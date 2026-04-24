# Needs: 03-build-screens/010-guardians/010-03-convert

## Description

Convert constrained HTML design to Flutter widgets for Co-Guardians using stitch-flutter

## Inputs

- `.stitch/designs/guardians/design.html`
- `.stitch/designs/guardians/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/guardians/guardians_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
