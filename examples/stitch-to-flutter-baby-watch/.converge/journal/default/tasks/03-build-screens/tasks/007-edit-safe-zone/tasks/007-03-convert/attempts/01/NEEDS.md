# Needs: 03-build-screens/007-edit-safe-zone/007-03-convert

## Description

Convert constrained HTML design to Flutter widgets for Edit Safe Zone using stitch-flutter

## Inputs

- `.stitch/designs/edit-safe-zone/design.html`
- `.stitch/designs/edit-safe-zone/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/edit_safe_zone/edit_safe_zone_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
