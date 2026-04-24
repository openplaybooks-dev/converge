# Needs: 07-build-overlays/004-filter-date/004-03-convert

## Description

Convert constrained HTML design to Flutter widget for Filter Date Range overlay

## Inputs

- `.stitch/designs/filter-date/design.html`
- `.stitch/designs/filter-date/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `lib/widgets/overlays/filter_date/filter_date.dart`

## Checks

- **widget-exists**: Overlay widget file exists
- **dart-valid**: Dart analysis passes
- **uses-theme**: Uses Theme.of(context) for styling
- **no-hardcoded-colors**: No hardcoded colors — uses colorScheme
- **no-router-registration**: Overlay does NOT register a GoRoute
