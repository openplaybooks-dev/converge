# Checks: 07-build-overlays/005-event-detail/005-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-exists
**Description**: SPEC.md exists for event-detail
**Command**: `test -f .stitch/designs/event-detail/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >30 lines
**Command**: `test $(wc -l < .stitch/designs/event-detail/SPEC.md) -gt 30`