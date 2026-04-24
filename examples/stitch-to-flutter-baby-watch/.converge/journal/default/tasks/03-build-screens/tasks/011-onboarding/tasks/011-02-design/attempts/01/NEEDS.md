# Needs: 03-build-screens/011-onboarding/011-02-design

## Description

Generate constrained HTML design for Onboarding using Flutter HTML Glossary

## Inputs

- `.stitch/designs/onboarding/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`
- `.stitch/references/ANALYSIS.md`
- `.stitch/references/babyguard_onboarding_phase_2/code.html`

## Expected Outputs

- `.stitch/designs/onboarding/META.md`
- `.stitch/designs/onboarding/design.html`

## Checks

- **design-exists**: design.html exists for onboarding
- **meta-exists**: META.md exists for onboarding
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
