# Needs: 07-build-overlays/005-cycle-entry/005-05-mount

## Description

Mount Cycle Entry overlay in parent screen and wire trigger

## Inputs

- `lib/widgets/overlays/cycle_entry/cycle_entry.dart`
- `.stitch/designs/cycle-entry/SPEC.md`
- `lib/screens/cycle_tracking/cycle_tracking_screen.dart`

## Expected Outputs

- `lib/screens/cycle_tracking/cycle_tracking_screen.dart`

## Checks

- **parent-imports-overlay**: Parent screen imports the overlay widget
- **parent-shows-overlay**: Parent screen calls showModalBottomSheet or showDialog
- **dart-valid**: Dart analysis passes for parent screen
