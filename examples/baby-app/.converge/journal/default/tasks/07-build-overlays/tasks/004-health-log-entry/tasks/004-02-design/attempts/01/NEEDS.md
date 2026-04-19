# Needs: 07-build-overlays/004-health-log-entry/004-02-design

## Description

Generate constrained HTML design for Health Log Entry overlay using Flutter HTML Glossary

## Inputs

- `.stitch/designs/health-log-entry/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/health-log-entry/META.md`
- `.stitch/designs/health-log-entry/design.html`

## Checks

- **design-exists**: design.html exists for health-log-entry
- **meta-exists**: META.md exists for health-log-entry
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
