# Needs: 07-build-overlays/005-event-detail/005-01-spec

## Description

Generate Event Detail overlay specification

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/UX.md`
- `.stitch/screens.json`

## Expected Outputs

- `.stitch/designs/event-detail/SPEC.md`

## Checks

- **spec-exists**: SPEC.md exists for event-detail
- **spec-has-content**: SPEC.md has >30 lines
