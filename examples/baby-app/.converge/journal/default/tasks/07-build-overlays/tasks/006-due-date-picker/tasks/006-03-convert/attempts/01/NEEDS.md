# Needs: 07-build-overlays/006-due-date-picker/006-03-convert

## Description

Convert constrained HTML design to Flutter widget for Due Date Picker overlay

## Inputs

- `.stitch/designs/due-date-picker/design.html`
- `.stitch/designs/due-date-picker/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/widgets/overlays/due_date_picker/due_date_picker.dart`

## Checks

- **widget-exists**: Overlay widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
- **no-router-registration**: Overlay does NOT register a GoRoute
