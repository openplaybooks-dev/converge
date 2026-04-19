# Needs: 07-build-overlays/006-due-date-picker/006-05-mount

## Description

Mount Due Date Picker overlay in parent screen and wire trigger

## Inputs

- `lib/widgets/overlays/due_date_picker/due_date_picker.dart`
- `.stitch/designs/due-date-picker/SPEC.md`
- `lib/screens/settings/settings_screen.dart`

## Expected Outputs

- `lib/screens/settings/settings_screen.dart`

## Checks

- **parent-imports-overlay**: Parent screen imports the overlay widget
- **parent-shows-overlay**: Parent screen calls showModalBottomSheet or showDialog
- **dart-valid**: Dart analysis passes for parent screen
