# Checks: 06-guides/007-customize-an-example

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/guides/customize-an-example.md`

## page-frontmatter
**Description**: title + sources frontmatter
**Command**: `head -10 docs/guides/customize-an-example.md | grep -q '^title:' && head -10 docs/guides/customize-an-example.md | grep -q '^sources:'`

## lists-edit-targets
**Description**: lists the most-edited files
**Command**: `grep -qiE 'playbook\.yml|TASK\.md|input file|topic|idea\.md' docs/guides/customize-an-example.md`

## links-back-to-gallery
**Description**: links back to the examples gallery
**Command**: `grep -qE '\(/examples/|\(\.\./examples/' docs/guides/customize-an-example.md`

## word-count-ok
**Description**: 600-1500 words
**Command**: `test -f docs/guides/customize-an-example.md && wc -w docs/guides/customize-an-example.md | awk '{exit ($1>=600&&$1<=1500?0:1)}'`