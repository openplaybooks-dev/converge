# Checks: 05-positioning/002-comparison-matrix

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## matrix-exists
**Description**: Comparison matrix document exists
**Command**: `test -f docs/comparison-matrix.md`

## matrix-has-table
**Description**: Document has a comparison table
**Command**: `grep -c '|' docs/comparison-matrix.md | xargs test 5 -le`