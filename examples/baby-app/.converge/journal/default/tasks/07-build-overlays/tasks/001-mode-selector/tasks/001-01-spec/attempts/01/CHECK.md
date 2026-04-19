# Checks: 07-build-overlays/001-mode-selector/001-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-exists
**Description**: SPEC.md exists for mode-selector
**Command**: `test -f .stitch/designs/mode-selector/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >30 lines
**Command**: `test $(wc -l < .stitch/designs/mode-selector/SPEC.md) -gt 30`