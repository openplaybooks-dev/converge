# Needs: 07-build-overlays/002-weight-entry/002-05-mount

## Description

Mount Weight Entry overlay in parent screen and wire trigger

## Inputs

- `lib/widgets/overlays/weight_entry/weight_entry.dart`
- `.stitch/designs/weight-entry/SPEC.md`
- `lib/screens/weight_nutrition/weight_nutrition_screen.dart`

## Expected Outputs

- `lib/screens/weight_nutrition/weight_nutrition_screen.dart`

## Checks

- **parent-imports-overlay**: Parent screen imports the overlay widget
- **parent-shows-overlay**: Parent screen calls showModalBottomSheet or showDialog
- **dart-valid**: Dart analysis passes for parent screen
