# Needs: 03-build-screens/011-onboarding/011-01-spec

## Description

Generate Onboarding screen specification

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/UX.md`
- `.stitch/screens.json`
- `.stitch/references/ANALYSIS.md`
- `.stitch/references/babyguard_onboarding_phase_2/code.html`

## Expected Outputs

- `.stitch/designs/onboarding/SPEC.md`

## Checks

- **spec-exists**: SPEC.md exists for onboarding
- **spec-has-content**: SPEC.md has >50 lines
