# Needs: 01-prepare-requirements/003-generate-ux

## Description

Generate UX specification from PRD using ux-design skill

## Inputs

- `PRD.md`

## Expected Outputs

- `.stitch/UX.md`

## Checks

- **ux-md-exists**: UX.md exists
- **ux-has-screens**: UX.md has screens section
- **ux-matches-idea**: UX.md references the app name from PRD.md
