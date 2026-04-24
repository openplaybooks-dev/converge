# Needs: 07-build-overlays/006-test-alert/006-02-design

## Description

Generate constrained HTML design for Test Alert Countdown overlay using Flutter HTML Glossary

## Inputs

- `.stitch/designs/test-alert/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/test-alert/META.md`
- `.stitch/designs/test-alert/design.html`

## Checks

- **design-exists**: design.html exists for test-alert
- **meta-exists**: META.md exists for test-alert
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
