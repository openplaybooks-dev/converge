# Needs: 07-build-overlays/007-delete-entry/007-02-design

## Description

Generate constrained HTML design for Delete Entry Confirmation overlay using Flutter HTML Glossary

## Inputs

- `.stitch/designs/delete-entry/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/delete-entry/META.md`
- `.stitch/designs/delete-entry/design.html`

## Checks

- **design-exists**: design.html exists for delete-entry
- **meta-exists**: META.md exists for delete-entry
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
