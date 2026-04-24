# Needs: 03-build-screens/007-edit-safe-zone/007-02-design

## Description

Generate constrained HTML design for Edit Safe Zone using Flutter HTML Glossary

## Inputs

- `.stitch/designs/edit-safe-zone/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`
- `.stitch/references/ANALYSIS.md`

## Expected Outputs

- `.stitch/designs/edit-safe-zone/META.md`
- `.stitch/designs/edit-safe-zone/design.html`

## Checks

- **design-exists**: design.html exists for edit-safe-zone
- **meta-exists**: META.md exists for edit-safe-zone
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
