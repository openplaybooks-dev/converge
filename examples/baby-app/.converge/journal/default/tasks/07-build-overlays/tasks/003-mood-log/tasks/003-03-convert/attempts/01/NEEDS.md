# Needs: 07-build-overlays/003-mood-log/003-03-convert

## Description

Convert constrained HTML design to Flutter widget for Mood Logging overlay

## Inputs

- `.stitch/designs/mood-log/design.html`
- `.stitch/designs/mood-log/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/widgets/overlays/mood_log/mood_log.dart`

## Checks

- **widget-exists**: Overlay widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
- **no-router-registration**: Overlay does NOT register a GoRoute
