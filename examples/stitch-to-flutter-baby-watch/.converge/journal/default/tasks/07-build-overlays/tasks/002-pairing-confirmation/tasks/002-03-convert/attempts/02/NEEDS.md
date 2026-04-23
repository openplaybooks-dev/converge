# Needs: 07-build-overlays/002-pairing-confirmation/002-03-convert

## Description

Convert constrained HTML design to Flutter widget for Pairing Confirmation overlay

## Inputs

- `.stitch/designs/pairing-confirmation/design.html`
- `.stitch/designs/pairing-confirmation/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/widgets/overlays/pairing_confirmation/pairing_confirmation.dart`

## Checks

- **widget-exists**: Overlay widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
- **no-router-registration**: Overlay does NOT register a GoRoute
