# Needs: 03-build-screens/006-add-safe-zone/006-02-design

## Description

Generate constrained HTML design for Add Safe Zone using Flutter HTML Glossary

## Inputs

- `.stitch/designs/add-safe-zone/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`
- `.stitch/references/ANALYSIS.md`

## Expected Outputs

- `.stitch/designs/add-safe-zone/META.md`
- `.stitch/designs/add-safe-zone/design.html`

## Checks

- **design-exists**: design.html exists for add-safe-zone
- **meta-exists**: META.md exists for add-safe-zone
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
