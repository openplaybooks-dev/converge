# Checks: 06-guides/002-generate-something-repeatedly

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/guides/generate-something-repeatedly.md`

## page-frontmatter
**Description**: title + sources frontmatter
**Command**: `head -10 docs/guides/generate-something-repeatedly.md | grep -q '^title:' && head -10 docs/guides/generate-something-repeatedly.md | grep -q '^sources:'`

## anchored-on-real-example
**Description**: page anchors on a real example from the gallery
**Command**: `grep -qE 'data-pipeline|cinematic-video-production' docs/guides/generate-something-repeatedly.md`

## shows-wbs-or-template-pattern
**Description**: shows the pattern for one-task-per-input-item
**Command**: `grep -qiE 'wbs|template|per-item|per item|each item|loop' docs/guides/generate-something-repeatedly.md`

## word-count-ok
**Description**: 700-1500 words
**Command**: `wc -w docs/guides/generate-something-repeatedly.md | awk '{exit ($1>=700&&$1<=1500?0:1)}'`