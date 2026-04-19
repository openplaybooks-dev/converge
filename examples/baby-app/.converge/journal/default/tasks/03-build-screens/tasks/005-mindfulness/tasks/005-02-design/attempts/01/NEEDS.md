# Needs: 03-build-screens/005-mindfulness/005-02-design

## Description

Generate constrained HTML design for Mindfulness using Flutter HTML Glossary

## Inputs

- `.stitch/designs/mindfulness/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/mindfulness/META.md`
- `.stitch/designs/mindfulness/design.html`

## Checks

- **design-exists**: design.html exists for mindfulness
- **meta-exists**: META.md exists for mindfulness
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
