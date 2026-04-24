# Checks: 01-prepare-requirements/005-analyze-references

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## analysis-md-exists
**Description**: ANALYSIS.md exists
**Command**: `test -f .stitch/references/ANALYSIS.md`

## analysis-has-design-system
**Description**: ANALYSIS.md has design system synthesis section
**Command**: `grep -q "## Design System Synthesis" .stitch/references/ANALYSIS.md`

## analysis-has-screen-inventory
**Description**: ANALYSIS.md has screen inventory section
**Command**: `grep -q "## Screen Inventory" .stitch/references/ANALYSIS.md`