# Checks: 07-troubleshooting/001-troubleshooting-index

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/troubleshooting/index.md`

## page-frontmatter
**Description**: title + sources frontmatter
**Command**: `head -10 docs/troubleshooting/index.md | grep -q '^title:' && head -10 docs/troubleshooting/index.md | grep -q '^sources:'`

## lists-most-symptoms
**Description**: lists at least 10 symptom entries
**Command**: `test $(grep -cE '^\s*-\s+\[|^\*\s+\[|^[0-9]+\.\s+\[' docs/troubleshooting/index.md) -ge 10`

## links-to-read-the-journal
**Description**: links to the read-the-journal guide
**Command**: `grep -qE '/guides/read-the-journal|\.\./guides/read-the-journal' docs/troubleshooting/index.md`