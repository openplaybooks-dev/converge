# Needs: 00-visual-target

## Description

Generate a reference screenshot from idea.md and derive ASSETS.md + JSON manifests from it.

## Expected Outputs

- `assets/visual-target.png`
- `ASSETS.md`
- `assets/sprites.json`

## Checks

- **visual-target-png-exists**: visual-target.png was generated
- **assets-md-has-size-column**: Every ASSETS.md table row has a numeric Size column
- **sprites-json-derived**: sprites.json was derived from ASSETS.md
