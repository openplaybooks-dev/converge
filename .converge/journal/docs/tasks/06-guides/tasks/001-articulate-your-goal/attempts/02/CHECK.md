# Checks: 06-guides/001-articulate-your-goal

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/guides/articulate-your-goal.md`

## page-frontmatter
**Description**: title + sources frontmatter
**Command**: `head -10 docs/guides/articulate-your-goal.md | grep -q '^title:' && head -10 docs/guides/articulate-your-goal.md | grep -q '^sources:'`

## covers-three-questions
**Description**: covers the three articulation questions (outputs, done, verify)
**Command**: `grep -qiE 'output|done|verify' docs/guides/articulate-your-goal.md`

## links-to-examples-or-from-problem
**Description**: links to examples or to the from-problem-to-playbook getting-started page
**Command**: `grep -qE '\(/examples/|/getting-started/from-problem-to-playbook' docs/guides/articulate-your-goal.md`

## word-count-ok
**Description**: 600-1500 words
**Command**: `test -f docs/guides/articulate-your-goal.md && wc -w docs/guides/articulate-your-goal.md | awk '{exit ($1>=600&&$1<=1500?0:1)}'`