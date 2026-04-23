# Needs: 03-build-screens/009-settings/009-01-spec

## Description

Generate Settings screen specification

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/UX.md`
- `.stitch/screens.json`
- `.stitch/references/ANALYSIS.md`
- `.stitch/references/settings/code.html`

## Expected Outputs

- `.stitch/designs/settings/SPEC.md`

## Checks

- **spec-exists**: SPEC.md exists for settings
- **spec-has-content**: SPEC.md has >50 lines
