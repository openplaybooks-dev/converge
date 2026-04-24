# Needs: 07-build-overlays/006-test-alert/006-01-spec

## Description

Generate Test Alert Countdown overlay specification

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/UX.md`
- `.stitch/screens.json`

## Expected Outputs

- `.stitch/designs/test-alert/SPEC.md`

## Checks

- **spec-exists**: SPEC.md exists for test-alert
- **spec-has-content**: SPEC.md has >30 lines
