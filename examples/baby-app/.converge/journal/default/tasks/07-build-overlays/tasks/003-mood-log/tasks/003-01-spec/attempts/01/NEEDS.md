# Needs: 07-build-overlays/003-mood-log/003-01-spec

## Description

Generate Mood Logging overlay specification

## Inputs

- `.stitch/system/DESIGN.md`
- `.stitch/UX.md`
- `.stitch/screens.json`
- `lib/screens/mood_wellness/mood_wellness_screen.dart`

## Expected Outputs

- `.stitch/designs/mood-log/SPEC.md`

## Checks

- **spec-exists**: SPEC.md exists for mood-log
- **spec-has-content**: SPEC.md has >30 lines
