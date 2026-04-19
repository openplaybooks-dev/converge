# Needs: 07-build-overlays/002-weight-entry/002-02-design

## Description

Generate constrained HTML design for Weight Entry overlay using Flutter HTML Glossary

## Inputs

- `.stitch/designs/weight-entry/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/weight-entry/META.md`
- `.stitch/designs/weight-entry/design.html`

## Checks

- **design-exists**: design.html exists for weight-entry
- **meta-exists**: META.md exists for weight-entry
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
