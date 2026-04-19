# Needs: 07-build-overlays/007-delete-entry/007-01-spec

## Description

Generate Delete Entry Confirmation overlay specification

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/UX.md`
- `.stitch/screens.json`
- `lib/screens/health_log/health_log_screen.dart`

## Expected Outputs

- `.stitch/designs/delete-entry/SPEC.md`

## Checks

- **spec-exists**: SPEC.md exists for delete-entry
- **spec-has-content**: SPEC.md has >30 lines
