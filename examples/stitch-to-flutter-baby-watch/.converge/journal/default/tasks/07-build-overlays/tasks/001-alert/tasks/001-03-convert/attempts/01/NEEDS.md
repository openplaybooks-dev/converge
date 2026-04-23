# Needs: 07-build-overlays/001-alert/001-03-convert

## Description

Convert constrained HTML design to Flutter widget for Alert Screen overlay

## Inputs

- `.stitch/designs/alert/design.html`
- `.stitch/designs/alert/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/widgets/overlays/alert/alert.dart`

## Checks

- **widget-exists**: Overlay widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
- **no-router-registration**: Overlay does NOT register a GoRoute
