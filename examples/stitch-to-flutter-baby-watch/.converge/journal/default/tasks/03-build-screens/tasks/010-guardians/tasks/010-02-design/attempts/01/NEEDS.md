# Needs: 03-build-screens/010-guardians/010-02-design

## Description

Generate constrained HTML design for Co-Guardians using Flutter HTML Glossary

## Inputs

- `.stitch/designs/guardians/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`
- `.stitch/references/ANALYSIS.md`
- `.stitch/references/ch_p_nh_n_l_i_m_i/code.html`

## Expected Outputs

- `.stitch/designs/guardians/META.md`
- `.stitch/designs/guardians/design.html`

## Checks

- **design-exists**: design.html exists for guardians
- **meta-exists**: META.md exists for guardians
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
