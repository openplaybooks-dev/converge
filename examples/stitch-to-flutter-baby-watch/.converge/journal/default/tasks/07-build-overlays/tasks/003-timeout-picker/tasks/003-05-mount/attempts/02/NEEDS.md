# Needs: 07-build-overlays/003-timeout-picker/003-05-mount

## Description

Mount Timeout Picker overlay in parent screen and wire trigger

## Inputs

- `lib/widgets/overlays/timeout_picker/timeout_picker.dart`
- `.stitch/designs/timeout-picker/SPEC.md`
- `lib/screens/settings/settings_screen.dart`

## Expected Outputs

- `lib/screens/settings/settings_screen.dart`

## Checks

- **parent-imports-overlay**: Parent screen imports the overlay widget
- **parent-shows-overlay**: Parent screen calls showModalBottomSheet or showDialog
- **dart-valid**: Dart analysis passes for parent screen
