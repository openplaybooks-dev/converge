# Needs: 07-build-overlays/005-event-detail/005-05-mount

## Description

Mount Event Detail overlay in parent screen and wire trigger

## Inputs

- `lib/widgets/overlays/event_detail/event_detail.dart`
- `.stitch/designs/event-detail/SPEC.md`

## Checks

- **parent-imports-overlay**: Parent screen imports the overlay widget
- **parent-shows-overlay**: Parent screen calls showModalBottomSheet or showDialog
- **dart-valid**: Dart analysis passes for parent screen
