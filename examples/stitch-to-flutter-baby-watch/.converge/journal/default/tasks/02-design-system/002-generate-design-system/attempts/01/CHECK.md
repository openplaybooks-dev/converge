# Checks: 02-design-system/002-generate-design-system

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## design-md-exists
**Description**: DESIGN.md exists
**Command**: `test -f .stitch/system/DESIGN.md`

## design-md-has-colors
**Description**: DESIGN.md contains color palette
**Command**: `grep -q "Color Palette" .stitch/system/DESIGN.md`

## design-md-has-typography
**Description**: DESIGN.md contains typography
**Command**: `grep -q "Typography" .stitch/system/DESIGN.md`