# Needs: 03-build-screens/011-onboarding/011-03-convert

## Description

Convert constrained HTML design to Flutter widgets for Onboarding using stitch-flutter

## Inputs

- `.stitch/designs/onboarding/design.html`
- `.stitch/designs/onboarding/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/onboarding/onboarding_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
