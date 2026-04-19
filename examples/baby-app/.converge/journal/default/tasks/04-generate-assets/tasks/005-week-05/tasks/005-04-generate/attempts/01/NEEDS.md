# Needs: 04-generate-assets/005-week-05/005-04-generate

## Description

Generate the actual SVG asset file using AI illustration generation

## Inputs

- `.converge/playbooks/default/tasks/04-generate-assets/tasks/005-week-05/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `assets/illustrations/baby-sizes/week-05.svg`

## Checks

- **svg-exists**: SVG file was generated
- **svg-valid**: File contains valid SVG markup
- **svg-size-reasonable**: SVG file size is reasonable (not empty, not huge)
