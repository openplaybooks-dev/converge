# Checks: 05-positioning/001-tagline-pitch

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## messaging-exists
**Description**: Brand messaging document exists
**Command**: `test -f docs/brand-messaging.md`

## messaging-has-tagline
**Description**: Document includes tagline
**Command**: `grep -qi 'tagline\|one-liner' docs/brand-messaging.md`