# Needs: 07-build-overlays/002-weight-entry/002-03-convert

## Description

Convert constrained HTML design to Flutter widget for Weight Entry overlay

## Inputs

- `.stitch/designs/weight-entry/design.html`
- `.stitch/designs/weight-entry/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/widgets/overlays/weight_entry/weight_entry.dart`

## Checks

- **widget-exists**: Overlay widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
- **no-router-registration**: Overlay does NOT register a GoRoute
