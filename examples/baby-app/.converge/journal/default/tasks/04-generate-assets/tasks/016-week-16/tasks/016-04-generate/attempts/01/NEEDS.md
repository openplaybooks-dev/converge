# Needs: 04-generate-assets/016-week-16/016-04-generate

## Description

Generate the actual SVG asset file using AI illustration generation

## Inputs

- `.converge/playbooks/default/tasks/04-generate-assets/tasks/016-week-16/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `assets/illustrations/baby-sizes/week-16.svg`

## Checks

- **svg-exists**: SVG file was generated
- **svg-valid**: File contains valid SVG markup
- **svg-size-reasonable**: SVG file size is reasonable (not empty, not huge)
