# Checks: 07-build-overlays/001-alert/001-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-exists
**Description**: SPEC.md exists for alert
**Command**: `test -f .stitch/designs/alert/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >30 lines
**Command**: `test $(wc -l < .stitch/designs/alert/SPEC.md) -gt 30`