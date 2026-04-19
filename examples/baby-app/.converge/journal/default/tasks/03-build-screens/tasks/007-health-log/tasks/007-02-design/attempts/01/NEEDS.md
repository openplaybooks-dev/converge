# Needs: 03-build-screens/007-health-log/007-02-design

## Description

Generate constrained HTML design for Health Log using Flutter HTML Glossary

## Inputs

- `.stitch/designs/health-log/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/health-log/META.md`
- `.stitch/designs/health-log/design.html`

## Checks

- **design-exists**: design.html exists for health-log
- **meta-exists**: META.md exists for health-log
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
