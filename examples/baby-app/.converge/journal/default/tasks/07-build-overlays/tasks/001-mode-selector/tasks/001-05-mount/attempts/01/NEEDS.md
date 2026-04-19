# Needs: 07-build-overlays/001-mode-selector/001-05-mount

## Description

Mount Mode Selection overlay in parent screen and wire trigger

## Inputs

- `lib/widgets/overlays/mode_selector/mode_selector.dart`
- `.stitch/designs/mode-selector/SPEC.md`
- `lib/screens/home/home_screen.dart`

## Expected Outputs

- `lib/screens/home/home_screen.dart`

## Checks

- **parent-imports-overlay**: Parent screen imports the overlay widget
- **parent-shows-overlay**: Parent screen calls showModalBottomSheet or showDialog
- **dart-valid**: Dart analysis passes for parent screen
