# Needs: 07-build-overlays/006-test-alert/006-03-convert

## Description

Convert constrained HTML design to Flutter widget for Test Alert Countdown overlay

## Inputs

- `.stitch/designs/test-alert/design.html`
- `.stitch/designs/test-alert/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/widgets/overlays/test_alert/test_alert.dart`

## Checks

- **widget-exists**: Overlay widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
- **no-router-registration**: Overlay does NOT register a GoRoute
