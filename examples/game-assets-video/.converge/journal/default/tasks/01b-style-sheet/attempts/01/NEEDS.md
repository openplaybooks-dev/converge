# Needs: 01b-style-sheet

## Description

Render the universal style-anchor image used by every downstream prop, tile, and bg generator.

## Expected Outputs

- `assets/concept/style-sheet.png`
- `assets/concept/style-sheet.prompt.txt`
- `assets/concept/style-sheet.seed.txt`

## Checks

- **style-sheet-exists**: assets/concept/style-sheet.png was generated
- **style-sheet-has-min-size**: style-sheet.png is at least 1024x512 (matches generator's 1536x1024 native output)
