# Needs: 04-generate-assets/010-week-10/010-04-generate

## Description

Generate the actual SVG asset file using AI illustration generation

## Inputs

- `.converge/playbooks/default/tasks/04-generate-assets/tasks/010-week-10/SPEC.md`
- `.stitch/system/DESIGN.md`

## Expected Outputs

- `assets/illustrations/baby-sizes/week-10.svg`

## Checks

- **svg-exists**: SVG file was generated
- **svg-valid**: File contains valid SVG markup
- **svg-size-reasonable**: SVG file size is reasonable (not empty, not huge)
