# Needs: 03-build-screens/008-history/008-03-convert

## Description

Convert constrained HTML design to Flutter widgets for History using stitch-flutter

## Inputs

- `.stitch/designs/history/design.html`
- `.stitch/designs/history/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/history/history_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
