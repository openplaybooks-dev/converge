# Needs: 07-build-overlays/005-event-detail/005-03-convert

## Description

Convert constrained HTML design to Flutter widget for Event Detail overlay

## Inputs

- `.stitch/designs/event-detail/design.html`
- `.stitch/designs/event-detail/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/widgets/overlays/event_detail/event_detail.dart`

## Checks

- **widget-exists**: Overlay widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
- **no-router-registration**: Overlay does NOT register a GoRoute
