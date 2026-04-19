# Needs: 03-build-screens/006-exercise-detail/006-02-design

## Description

Generate constrained HTML design for Exercise Detail using Flutter HTML Glossary

## Inputs

- `.stitch/designs/exercise-detail/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/exercise-detail/META.md`
- `.stitch/designs/exercise-detail/design.html`

## Checks

- **design-exists**: design.html exists for exercise-detail
- **meta-exists**: META.md exists for exercise-detail
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
