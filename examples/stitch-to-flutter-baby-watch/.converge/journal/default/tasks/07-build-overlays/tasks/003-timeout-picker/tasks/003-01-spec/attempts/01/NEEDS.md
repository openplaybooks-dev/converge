# Needs: 07-build-overlays/003-timeout-picker/003-01-spec

## Description

Generate Timeout Picker overlay specification

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/UX.md`
- `.stitch/screens.json`

## Expected Outputs

- `.stitch/designs/timeout-picker/SPEC.md`

## Checks

- **spec-exists**: SPEC.md exists for timeout-picker
- **spec-has-content**: SPEC.md has >30 lines
