# Needs: 03-build-screens/006-add-safe-zone/006-03-convert

## Description

Convert constrained HTML design to Flutter widgets for Add Safe Zone using stitch-flutter

## Inputs

- `.stitch/designs/add-safe-zone/design.html`
- `.stitch/designs/add-safe-zone/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/add_safe_zone/add_safe_zone_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
