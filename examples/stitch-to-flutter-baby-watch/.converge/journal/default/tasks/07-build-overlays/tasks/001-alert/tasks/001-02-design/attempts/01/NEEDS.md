# Needs: 07-build-overlays/001-alert/001-02-design

## Description

Generate constrained HTML design for Alert Screen overlay using Flutter HTML Glossary

## Inputs

- `.stitch/designs/alert/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/alert/META.md`
- `.stitch/designs/alert/design.html`

## Checks

- **design-exists**: design.html exists for alert
- **meta-exists**: META.md exists for alert
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
