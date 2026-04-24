# Needs: 07-build-overlays/003-timeout-picker/003-02-design

## Description

Generate constrained HTML design for Timeout Picker overlay using Flutter HTML Glossary

## Inputs

- `.stitch/designs/timeout-picker/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/timeout-picker/META.md`
- `.stitch/designs/timeout-picker/design.html`

## Checks

- **design-exists**: design.html exists for timeout-picker
- **meta-exists**: META.md exists for timeout-picker
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
