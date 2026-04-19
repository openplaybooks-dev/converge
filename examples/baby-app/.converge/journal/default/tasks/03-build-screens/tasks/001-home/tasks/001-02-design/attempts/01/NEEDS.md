# Needs: 03-build-screens/001-home/001-02-design

## Description

Generate constrained HTML design for Home using Flutter HTML Glossary

## Inputs

- `.stitch/designs/home/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/home/META.md`
- `.stitch/designs/home/design.html`

## Checks

- **design-exists**: design.html exists for home
- **meta-exists**: META.md exists for home
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
