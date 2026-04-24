# Checks: 07-build-overlays/002-pairing-confirmation/002-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-exists
**Description**: SPEC.md exists for pairing-confirmation
**Command**: `test -f .stitch/designs/pairing-confirmation/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >30 lines
**Command**: `test $(wc -l < .stitch/designs/pairing-confirmation/SPEC.md) -gt 30`