# Needs: 07-build-overlays/004-filter-date/004-02-design

## Description

Generate constrained HTML design for Filter Date Range overlay using Flutter HTML Glossary

## Inputs

- `.stitch/designs/filter-date/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/filter-date/META.md`
- `.stitch/designs/filter-date/design.html`

## Checks

- **design-exists**: design.html exists for filter-date
- **meta-exists**: META.md exists for filter-date
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
