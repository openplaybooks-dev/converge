# Needs: 07-build-overlays/002-pairing-confirmation/002-02-design

## Description

Generate constrained HTML design for Pairing Confirmation overlay using Flutter HTML Glossary

## Inputs

- `.stitch/designs/pairing-confirmation/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/pairing-confirmation/META.md`
- `.stitch/designs/pairing-confirmation/design.html`

## Checks

- **design-exists**: design.html exists for pairing-confirmation
- **meta-exists**: META.md exists for pairing-confirmation
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
