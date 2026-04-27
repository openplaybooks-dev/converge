# Checks: 04-getting-started/004-from-problem-to-playbook

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/getting-started/from-problem-to-playbook.md`

## page-frontmatter
**Description**: title + sources frontmatter
**Command**: `head -10 docs/getting-started/from-problem-to-playbook.md | grep -q '^title:' && head -10 docs/getting-started/from-problem-to-playbook.md | grep -q '^sources:'`

## links-to-examples-gallery
**Description**: links to the examples gallery
**Command**: `grep -qE '\(/examples/|\(\.\./examples/' docs/getting-started/from-problem-to-playbook.md`

## shows-three-questions
**Description**: page asks the reader to define what 'done' looks like
**Command**: `grep -qiE 'what.*done|what.*success|what.*output' docs/getting-started/from-problem-to-playbook.md`

## word-count-ok
**Description**: 500-1500 words
**Command**: `test -f docs/getting-started/from-problem-to-playbook.md && wc -w docs/getting-started/from-problem-to-playbook.md | awk '{exit ($1>=500&&$1<=1500?0:1)}'`