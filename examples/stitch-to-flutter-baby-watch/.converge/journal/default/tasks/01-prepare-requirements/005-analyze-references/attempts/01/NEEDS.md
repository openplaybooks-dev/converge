# Needs: 01-prepare-requirements/005-analyze-references

## Description

Analyze reference screenshots and design systems into a structured synthesis document

## Inputs

- `idea.md`
- `.stitch/references/**/screen.png`
- `.stitch/references/**/code.html`
- `.stitch/references/**/DESIGN.md`

## Expected Outputs

- `.stitch/references/ANALYSIS.md`

## Checks

- **analysis-md-exists**: ANALYSIS.md exists
- **analysis-has-design-system**: ANALYSIS.md has design system synthesis section
- **analysis-has-screen-inventory**: ANALYSIS.md has screen inventory section
