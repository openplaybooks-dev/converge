# Needs: 07-build-overlays/001-alert/001-01-spec

## Description

Generate Alert Screen overlay specification

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/UX.md`
- `.stitch/screens.json`

## Expected Outputs

- `.stitch/designs/alert/SPEC.md`

## Checks

- **spec-exists**: SPEC.md exists for alert
- **spec-has-content**: SPEC.md has >30 lines
