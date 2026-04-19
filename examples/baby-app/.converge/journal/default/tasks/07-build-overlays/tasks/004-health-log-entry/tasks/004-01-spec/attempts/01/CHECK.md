# Checks: 07-build-overlays/004-health-log-entry/004-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-exists
**Description**: SPEC.md exists for health-log-entry
**Command**: `test -f .stitch/designs/health-log-entry/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >30 lines
**Command**: `test $(wc -l < .stitch/designs/health-log-entry/SPEC.md) -gt 30`