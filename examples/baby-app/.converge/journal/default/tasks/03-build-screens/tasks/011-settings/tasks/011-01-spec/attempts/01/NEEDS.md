# Needs: 03-build-screens/011-settings/011-01-spec

## Description

Generate Settings screen specification

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/UX.md`
- `.stitch/screens.json`

## Expected Outputs

- `.stitch/designs/settings/SPEC.md`

## Checks

- **spec-exists**: SPEC.md exists for settings
- **spec-has-content**: SPEC.md has >50 lines
