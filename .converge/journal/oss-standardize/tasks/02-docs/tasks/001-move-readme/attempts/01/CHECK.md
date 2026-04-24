# Checks: 02-docs/001-move-readme

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## root-readme-exists
**Description**: Root README.md exists
**Command**: `test -f README.md`

## root-readme-has-converge
**Description**: Root README mentions Converge
**Command**: `grep -qi 'converge' README.md`

## root-readme-not-harness-ascii
**Description**: Root README has no HARNESS ASCII art
**Command**: `! grep -q 'HARNESS' README.md`