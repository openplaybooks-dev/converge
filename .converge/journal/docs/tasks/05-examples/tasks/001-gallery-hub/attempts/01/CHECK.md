# Checks: 05-examples/001-gallery-hub

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/examples/index.md`

## has-frontmatter
**Description**: title + sources frontmatter
**Command**: `head -10 docs/examples/index.md | grep -q '^title:' && head -10 docs/examples/index.md | grep -q '^sources:'`

## groups-by-category
**Description**: page is grouped by category headings
**Command**: `grep -qiE '^##\s+(learning|building software|research|creative|security|agent protocol)' docs/examples/index.md`

## lists-most-examples
**Description**: lists at least 15 example links
**Command**: `test $(grep -cE '^\s*-\s+\[|^\*\s+\[' docs/examples/index.md) -ge 15`

## not-too-long
**Description**: <=1500 words (the hub is scannable, not exhaustive)
**Command**: `wc -w docs/examples/index.md | awk '{exit ($1<=1500?0:1)}'`