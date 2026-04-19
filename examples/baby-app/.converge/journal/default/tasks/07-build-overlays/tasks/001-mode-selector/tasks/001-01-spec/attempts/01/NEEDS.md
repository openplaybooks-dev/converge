# Needs: 07-build-overlays/001-mode-selector/001-01-spec

## Description

Generate Mode Selection overlay specification

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/UX.md`
- `.stitch/screens.json`
- `lib/screens/home/home_screen.dart`

## Expected Outputs

- `.stitch/designs/mode-selector/SPEC.md`

## Checks

- **spec-exists**: SPEC.md exists for mode-selector
- **spec-has-content**: SPEC.md has >30 lines
