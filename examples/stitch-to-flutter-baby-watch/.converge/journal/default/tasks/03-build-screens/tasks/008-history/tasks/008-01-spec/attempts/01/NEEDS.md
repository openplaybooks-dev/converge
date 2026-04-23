# Needs: 03-build-screens/008-history/008-01-spec

## Description

Generate History screen specification

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/UX.md`
- `.stitch/screens.json`
- `.stitch/references/ANALYSIS.md`
- `.stitch/references/history/code.html`

## Expected Outputs

- `.stitch/designs/history/SPEC.md`

## Checks

- **spec-exists**: SPEC.md exists for history
- **spec-has-content**: SPEC.md has >50 lines
