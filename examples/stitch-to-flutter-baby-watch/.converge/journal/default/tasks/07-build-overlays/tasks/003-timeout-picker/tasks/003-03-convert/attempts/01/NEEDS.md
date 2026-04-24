# Needs: 07-build-overlays/003-timeout-picker/003-03-convert

## Description

Convert constrained HTML design to Flutter widget for Timeout Picker overlay

## Inputs

- `.stitch/designs/timeout-picker/design.html`
- `.stitch/designs/timeout-picker/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/widgets/overlays/timeout_picker/timeout_picker.dart`

## Checks

- **widget-exists**: Overlay widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
- **no-router-registration**: Overlay does NOT register a GoRoute
