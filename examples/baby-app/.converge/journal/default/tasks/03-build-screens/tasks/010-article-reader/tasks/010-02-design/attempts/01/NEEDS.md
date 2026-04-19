# Needs: 03-build-screens/010-article-reader/010-02-design

## Description

Generate constrained HTML design for Article Reader using Flutter HTML Glossary

## Inputs

- `.stitch/designs/article-reader/SPEC.md`
- `.stitch/system/DESIGN.md`
- `.stitch/system/META.md`

## Expected Outputs

- `.stitch/designs/article-reader/META.md`
- `.stitch/designs/article-reader/design.html`

## Checks

- **design-exists**: design.html exists for article-reader
- **meta-exists**: META.md exists for article-reader
- **uses-glossary**: HTML uses Flutter HTML Glossary vocabulary
- **has-data-attributes**: HTML uses data-* attributes for Flutter conversion
