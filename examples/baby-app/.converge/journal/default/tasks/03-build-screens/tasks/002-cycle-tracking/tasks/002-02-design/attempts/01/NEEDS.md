# Needs: 03-build-screens/002-cycle-tracking/002-02-design

## Description

Generate constrained HTML design for Cycle Tracking using Flutter HTML Glossary

## Inputs

- `.stitch/designs/cycle-tracking/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/cycle-tracking/META.md`
- `.stitch/designs/cycle-tracking/design.html`

## Checks

- **design-exists**: design.html exists for cycle-tracking
- **meta-exists**: META.md exists for cycle-tracking
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
