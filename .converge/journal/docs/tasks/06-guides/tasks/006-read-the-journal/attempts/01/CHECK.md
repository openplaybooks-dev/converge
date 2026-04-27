# Checks: 06-guides/006-read-the-journal

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/guides/read-the-journal.md`

## page-frontmatter
**Description**: title + sources frontmatter
**Command**: `head -10 docs/guides/read-the-journal.md | grep -q '^title:' && head -10 docs/guides/read-the-journal.md | grep -q '^sources:'`

## shows-journal-path
**Description**: documents the journal location
**Command**: `grep -qE '\.converge/journal' docs/guides/read-the-journal.md`

## shows-learn-md
**Description**: covers LEARN.md
**Command**: `grep -qE 'LEARN\.md' docs/guides/read-the-journal.md`

## shows-cat-or-jq
**Description**: shows shell debugging commands
**Command**: `grep -qE 'cat|jq|tail|less' docs/guides/read-the-journal.md`

## word-count-ok
**Description**: 600-1500 words
**Command**: `wc -w docs/guides/read-the-journal.md | awk '{exit ($1>=600&&$1<=1500?0:1)}'`