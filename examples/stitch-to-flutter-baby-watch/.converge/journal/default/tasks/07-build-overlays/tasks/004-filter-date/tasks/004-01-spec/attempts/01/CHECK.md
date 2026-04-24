# Checks: 07-build-overlays/004-filter-date/004-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-exists
**Description**: SPEC.md exists for filter-date
**Command**: `test -f .stitch/designs/filter-date/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >30 lines
**Command**: `test $(wc -l < .stitch/designs/filter-date/SPEC.md) -gt 30`