# Checks: 03-build-screens/012-invite-accept/012-01-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## spec-exists
**Description**: SPEC.md exists for invite-accept
**Command**: `test -f .stitch/designs/invite-accept/SPEC.md`

## spec-has-content
**Description**: SPEC.md has >50 lines
**Command**: `test $(wc -l < .stitch/designs/invite-accept/SPEC.md) -gt 50`