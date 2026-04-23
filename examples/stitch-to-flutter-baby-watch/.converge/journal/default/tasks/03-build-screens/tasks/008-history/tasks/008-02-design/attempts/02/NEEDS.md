# Needs: 03-build-screens/008-history/008-02-design

## Description

Generate constrained HTML design for History using Flutter HTML Glossary

## Inputs

- `.stitch/designs/history/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`
- `.stitch/references/ANALYSIS.md`
- `.stitch/references/history/code.html`

## Expected Outputs

- `.stitch/designs/history/META.md`
- `.stitch/designs/history/design.html`

## Checks

- **design-exists**: design.html exists for history
- **meta-exists**: META.md exists for history
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
