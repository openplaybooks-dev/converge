# Checks: 04-getting-started/001-why-converge

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/getting-started/why-converge.md`

## page-has-frontmatter
**Description**: page has title + sources frontmatter
**Command**: `head -10 docs/getting-started/why-converge.md | grep -q '^title:' && head -10 docs/getting-started/why-converge.md | grep -q '^sources:'`

## page-has-define-done
**Description**: page introduces the 'define done' framing
**Command**: `grep -q 'define done' docs/getting-started/why-converge.md || grep -q 'Define done' docs/getting-started/why-converge.md`

## page-not-too-long
**Description**: page is <=600 words (under 3 min read)
**Command**: `test -f docs/getting-started/why-converge.md && wc -w docs/getting-started/why-converge.md | awk '{exit ($1<=600?0:1)}'`

## page-not-too-short
**Description**: page is >=200 words (substantive)
**Command**: `test -f docs/getting-started/why-converge.md && wc -w docs/getting-started/why-converge.md | awk '{exit ($1>=200?0:1)}'`