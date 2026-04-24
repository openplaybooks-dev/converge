# Needs: 03-build-screens/009-settings/009-02-design

## Description

Generate constrained HTML design for Settings using Flutter HTML Glossary

## Inputs

- `.stitch/designs/settings/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`
- `.stitch/references/ANALYSIS.md`
- `.stitch/references/settings/code.html`

## Expected Outputs

- `.stitch/designs/settings/META.md`
- `.stitch/designs/settings/design.html`

## Checks

- **design-exists**: design.html exists for settings
- **meta-exists**: META.md exists for settings
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
