# Needs: 07-build-overlays/003-mood-log/003-05-mount

## Description

Mount Mood Logging overlay in parent screen and wire trigger

## Inputs

- `lib/widgets/overlays/mood_log/mood_log.dart`
- `.stitch/designs/mood-log/SPEC.md`
- `lib/screens/mood_wellness/mood_wellness_screen.dart`

## Expected Outputs

- `lib/screens/mood_wellness/mood_wellness_screen.dart`

## Checks

- **parent-imports-overlay**: Parent screen imports the overlay widget
- **parent-shows-overlay**: Parent screen calls showModalBottomSheet or showDialog
- **dart-valid**: Dart analysis passes for parent screen
