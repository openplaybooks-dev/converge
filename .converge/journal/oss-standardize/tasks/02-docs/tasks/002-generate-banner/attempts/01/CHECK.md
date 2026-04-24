# Checks: 02-docs/002-generate-banner

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## banner-exists
**Description**: banner.svg exists at root
**Command**: `test -f banner.svg`

## banner-says-converge
**Description**: Banner SVG contains Converge text
**Command**: `grep -q 'CONVERGE\|Converge' banner.svg`

## banner-no-harness
**Description**: Banner SVG has no HARNESS text
**Command**: `! grep -qi 'HARNESS' banner.svg`