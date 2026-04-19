# Needs: 07-build-overlays/001-mode-selector/001-03-convert

## Description

Convert constrained HTML design to Flutter widget for Mode Selection overlay

## Inputs

- `.stitch/designs/mode-selector/design.html`
- `.stitch/designs/mode-selector/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/widgets/overlays/mode_selector/mode_selector.dart`

## Checks

- **widget-exists**: Overlay widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
- **no-router-registration**: Overlay does NOT register a GoRoute
