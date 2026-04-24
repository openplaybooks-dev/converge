# Needs: 07-build-overlays/004-filter-date/004-05-mount

## Description

Mount Filter Date Range overlay in parent screen and wire trigger

## Inputs

- `lib/widgets/overlays/filter_date/filter_date.dart`
- `.stitch/designs/filter-date/SPEC.md`

## Checks

- **parent-imports-overlay**: Parent screen imports the overlay widget
- **parent-shows-overlay**: Parent screen calls showModalBottomSheet or showDialog
- **dart-valid**: Dart analysis passes for parent screen
