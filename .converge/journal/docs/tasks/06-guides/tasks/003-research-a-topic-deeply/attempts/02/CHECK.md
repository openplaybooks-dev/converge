# Checks: 06-guides/003-research-a-topic-deeply

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/guides/research-a-topic-deeply.md`

## page-frontmatter
**Description**: title + sources frontmatter
**Command**: `head -10 docs/guides/research-a-topic-deeply.md | grep -q '^title:' && head -10 docs/guides/research-a-topic-deeply.md | grep -q '^sources:'`

## anchored-on-research-examples
**Description**: page anchors on a real research example
**Command**: `grep -qE 'deep-research|frontier-research|scientific-research' docs/guides/research-a-topic-deeply.md`

## explains-layered-or-iterative
**Description**: explains layered / iterative deepening
**Command**: `grep -qiE 'layer|iterat|deepen|round|pass' docs/guides/research-a-topic-deeply.md`

## word-count-ok
**Description**: 700-1500 words
**Command**: `wc -w docs/guides/research-a-topic-deeply.md | awk '{exit ($1>=700&&$1<=1500?0:1)}'`