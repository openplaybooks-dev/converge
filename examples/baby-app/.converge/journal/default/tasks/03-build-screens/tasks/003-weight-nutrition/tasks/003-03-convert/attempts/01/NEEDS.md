# Needs: 03-build-screens/003-weight-nutrition/003-03-convert

## Description

Convert constrained HTML design to Flutter widgets for Weight & Nutrition using stitch-flutter

## Inputs

- `.stitch/designs/weight-nutrition/design.html`
- `.stitch/designs/weight-nutrition/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/weight_nutrition/weight_nutrition_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
