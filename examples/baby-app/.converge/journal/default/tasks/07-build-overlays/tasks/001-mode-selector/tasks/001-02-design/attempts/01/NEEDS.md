# Needs: 07-build-overlays/001-mode-selector/001-02-design

## Description

Generate constrained HTML design for Mode Selection overlay using Flutter HTML Glossary

## Inputs

- `.stitch/designs/mode-selector/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/mode-selector/META.md`
- `.stitch/designs/mode-selector/design.html`

## Checks

- **design-exists**: design.html exists for mode-selector
- **meta-exists**: META.md exists for mode-selector
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
