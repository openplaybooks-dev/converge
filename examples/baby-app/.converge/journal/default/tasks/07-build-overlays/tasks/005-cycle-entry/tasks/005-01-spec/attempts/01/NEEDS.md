# Needs: 07-build-overlays/005-cycle-entry/005-01-spec

## Description

Generate Cycle Entry overlay specification

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/UX.md`
- `.stitch/screens.json`
- `lib/screens/cycle_tracking/cycle_tracking_screen.dart`

## Expected Outputs

- `.stitch/designs/cycle-entry/SPEC.md`

## Checks

- **spec-exists**: SPEC.md exists for cycle-entry
- **spec-has-content**: SPEC.md has >30 lines
