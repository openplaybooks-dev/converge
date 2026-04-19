# Needs: 07-build-overlays/007-delete-entry/007-03-convert

## Description

Convert constrained HTML design to Flutter widget for Delete Entry Confirmation overlay

## Inputs

- `.stitch/designs/delete-entry/design.html`
- `.stitch/designs/delete-entry/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/widgets/overlays/delete_entry/delete_entry.dart`

## Checks

- **widget-exists**: Overlay widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
- **no-router-registration**: Overlay does NOT register a GoRoute
