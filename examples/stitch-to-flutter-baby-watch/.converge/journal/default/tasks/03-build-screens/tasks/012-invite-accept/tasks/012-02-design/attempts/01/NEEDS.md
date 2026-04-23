# Needs: 03-build-screens/012-invite-accept/012-02-design

## Description

Generate constrained HTML design for Accept Invitation using Flutter HTML Glossary

## Inputs

- `.stitch/designs/invite-accept/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`
- `.stitch/references/ANALYSIS.md`
- `.stitch/references/co_guardians_list_phase_2/code.html`

## Expected Outputs

- `.stitch/designs/invite-accept/META.md`
- `.stitch/designs/invite-accept/design.html`

## Checks

- **design-exists**: design.html exists for invite-accept
- **meta-exists**: META.md exists for invite-accept
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
