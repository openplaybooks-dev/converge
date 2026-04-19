# Needs: 03-build-screens/009-education/009-02-design

## Description

Generate constrained HTML design for Education using Flutter HTML Glossary

## Inputs

- `.stitch/designs/education/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/education/META.md`
- `.stitch/designs/education/design.html`

## Checks

- **design-exists**: design.html exists for education
- **meta-exists**: META.md exists for education
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
