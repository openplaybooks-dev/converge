# Needs: 03-build-screens/002-cycle-tracking/002-03-convert

## Description

Convert constrained HTML design to Flutter widgets for Cycle Tracking using stitch-flutter

## Inputs

- `.stitch/designs/cycle-tracking/design.html`
- `.stitch/designs/cycle-tracking/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/cycle_tracking/cycle_tracking_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
