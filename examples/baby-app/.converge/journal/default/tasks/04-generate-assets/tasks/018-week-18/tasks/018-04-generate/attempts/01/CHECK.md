# Checks: 04-generate-assets/018-week-18/018-04-generate

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## svg-exists
**Description**: SVG file was generated
**Command**: `test -f assets/illustrations/baby-sizes/week-18.svg`

## svg-valid
**Description**: File contains valid SVG markup
**Command**: `head -5 assets/illustrations/baby-sizes/week-18.svg | grep -q '<svg'`

## svg-size-reasonable
**Description**: SVG file size is reasonable (not empty, not huge)
**Command**: `stat -f%z assets/illustrations/baby-sizes/week-18.svg 2>/dev/null | awk '{if ($1 > 100 && $1 < 500000) exit 0; exit 1}'`