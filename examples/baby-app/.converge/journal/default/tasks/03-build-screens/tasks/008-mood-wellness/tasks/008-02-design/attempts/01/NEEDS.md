# Needs: 03-build-screens/008-mood-wellness/008-02-design

## Description

Generate constrained HTML design for Mood & Wellness using Flutter HTML Glossary

## Inputs

- `.stitch/designs/mood-wellness/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/mood-wellness/META.md`
- `.stitch/designs/mood-wellness/design.html`

## Checks

- **design-exists**: design.html exists for mood-wellness
- **meta-exists**: META.md exists for mood-wellness
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
