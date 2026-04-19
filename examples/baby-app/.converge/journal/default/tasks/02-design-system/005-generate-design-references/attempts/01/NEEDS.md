# Needs: 02-design-system/005-generate-design-references

## Description

Generate project-specific HTML design mockups as reference examples for stitch-generate

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/screens.json`
- `.stitch/UX.md`

## Expected Outputs

- `.stitch/system/META.md`
- `.stitch/system/single-screen.html`
- `.stitch/system/multi-state-screen.html`
- `.stitch/system/celebration-screen.html`

## Checks

- **meta-md-exists**: META.md exists
- **single-screen-exists**: Single screen HTML exists
- **multi-state-exists**: Multi-state screen HTML exists
- **celebration-exists**: Celebration screen HTML exists
- **html-has-tokens**: HTML uses CSS custom properties
