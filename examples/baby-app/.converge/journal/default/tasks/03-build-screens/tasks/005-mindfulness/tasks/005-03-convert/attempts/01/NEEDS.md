# Needs: 03-build-screens/005-mindfulness/005-03-convert

## Description

Convert constrained HTML design to Flutter widgets for Mindfulness using stitch-flutter

## Inputs

- `.stitch/designs/mindfulness/design.html`
- `.stitch/designs/mindfulness/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/mindfulness/mindfulness_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
