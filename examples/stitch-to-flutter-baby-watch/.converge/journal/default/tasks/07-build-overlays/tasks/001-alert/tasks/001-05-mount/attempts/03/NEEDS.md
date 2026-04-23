# Needs: 07-build-overlays/001-alert/001-05-mount

## Description

Mount Alert Screen overlay in parent screen and wire trigger

## Inputs

- `lib/widgets/overlays/alert/alert.dart`
- `.stitch/designs/alert/SPEC.md`

## Checks

- **parent-imports-overlay**: Parent screen imports the overlay widget
- **parent-shows-overlay**: Parent screen calls showModalBottomSheet or showDialog
- **dart-valid**: Dart analysis passes for parent screen
