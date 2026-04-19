# Needs: 07-build-overlays/005-cycle-entry/005-02-design

## Description

Generate constrained HTML design for Cycle Entry overlay using Flutter HTML Glossary

## Inputs

- `.stitch/designs/cycle-entry/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/cycle-entry/META.md`
- `.stitch/designs/cycle-entry/design.html`

## Checks

- **design-exists**: design.html exists for cycle-entry
- **meta-exists**: META.md exists for cycle-entry
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
