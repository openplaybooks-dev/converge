# Needs: 03-build-screens/003-weight-nutrition/003-02-design

## Description

Generate constrained HTML design for Weight & Nutrition using Flutter HTML Glossary

## Inputs

- `.stitch/designs/weight-nutrition/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/weight-nutrition/META.md`
- `.stitch/designs/weight-nutrition/design.html`

## Checks

- **design-exists**: design.html exists for weight-nutrition
- **meta-exists**: META.md exists for weight-nutrition
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
