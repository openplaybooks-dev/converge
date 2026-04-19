# Needs: 07-build-overlays/005-cycle-entry/005-03-convert

## Description

Convert constrained HTML design to Flutter widget for Cycle Entry overlay

## Inputs

- `.stitch/designs/cycle-entry/design.html`
- `.stitch/designs/cycle-entry/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/widgets/overlays/cycle_entry/cycle_entry.dart`

## Checks

- **widget-exists**: Overlay widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
- **no-router-registration**: Overlay does NOT register a GoRoute
