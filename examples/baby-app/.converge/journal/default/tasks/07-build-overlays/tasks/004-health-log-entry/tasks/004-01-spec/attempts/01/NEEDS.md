# Needs: 07-build-overlays/004-health-log-entry/004-01-spec

## Description

Generate Health Log Entry overlay specification

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/UX.md`
- `.stitch/screens.json`
- `lib/screens/health_log/health_log_screen.dart`

## Expected Outputs

- `.stitch/designs/health-log-entry/SPEC.md`

## Checks

- **spec-exists**: SPEC.md exists for health-log-entry
- **spec-has-content**: SPEC.md has >30 lines
