# Needs: 03-build-screens/007-health-log/007-03-convert

## Description

Convert constrained HTML design to Flutter widgets for Health Log using stitch-flutter

## Inputs

- `.stitch/designs/health-log/design.html`
- `.stitch/designs/health-log/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/screens/health_log/health_log_screen.dart`

## Checks

- **screen-exists**: Screen widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
