# Needs: 07-build-overlays/006-test-alert/006-05-mount

## Description

Mount Test Alert Countdown overlay in parent screen and wire trigger

## Inputs

- `lib/widgets/overlays/test_alert/test_alert.dart`
- `.stitch/designs/test-alert/SPEC.md`

## Checks

- **parent-imports-overlay**: Parent screen imports the overlay widget
- **parent-shows-overlay**: Parent screen calls showModalBottomSheet or showDialog
- **dart-valid**: Dart analysis passes for parent screen
