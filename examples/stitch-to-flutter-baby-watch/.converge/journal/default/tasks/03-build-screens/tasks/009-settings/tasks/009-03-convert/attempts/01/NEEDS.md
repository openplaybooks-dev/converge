# Needs: 03-build-screens/009-settings/009-03-convert

## Description

Convert constrained HTML design to Flutter widgets for Settings using stitch-flutter

## Inputs

- `.stitch/designs/settings/design.html`
- `.stitch/designs/settings/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/settings/settings_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
