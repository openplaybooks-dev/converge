# Needs: 07-build-overlays/006-due-date-picker/006-01-spec

## Description

Generate Due Date Picker overlay specification

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/UX.md`
- `.stitch/screens.json`
- `lib/screens/settings/settings_screen.dart`

## Expected Outputs

- `.stitch/designs/due-date-picker/SPEC.md`

## Checks

- **spec-exists**: SPEC.md exists for due-date-picker
- **spec-has-content**: SPEC.md has >30 lines
