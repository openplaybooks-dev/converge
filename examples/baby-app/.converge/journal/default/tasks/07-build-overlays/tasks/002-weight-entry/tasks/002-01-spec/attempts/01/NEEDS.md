# Needs: 07-build-overlays/002-weight-entry/002-01-spec

## Description

Generate Weight Entry overlay specification

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/UX.md`
- `.stitch/screens.json`
- `lib/screens/weight_nutrition/weight_nutrition_screen.dart`

## Expected Outputs

- `.stitch/designs/weight-entry/SPEC.md`

## Checks

- **spec-exists**: SPEC.md exists for weight-entry
- **spec-has-content**: SPEC.md has >30 lines
