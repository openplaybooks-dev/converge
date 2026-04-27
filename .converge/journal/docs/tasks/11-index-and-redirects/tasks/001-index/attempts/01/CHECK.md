# Checks: 11-index-and-redirects/001-index

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/index.md`

## links-to-getting-started
**Description**: links into Getting Started
**Command**: `grep -qE 'getting-started/' docs/index.md`

## links-to-examples
**Description**: links into Examples gallery
**Command**: `grep -qE 'examples/' docs/index.md`

## links-to-troubleshooting
**Description**: links into Troubleshooting
**Command**: `grep -qE 'troubleshooting/' docs/index.md`

## short
**Description**: <=500 words (it's a hub, not a topic)
**Command**: `wc -w docs/index.md | awk '{exit ($1<=500?0:1)}'`