# Checks: 04-getting-started/005-next-steps

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/getting-started/next-steps.md`

## links-into-examples
**Description**: links into Examples gallery
**Command**: `grep -qE '\(/examples/|\(\.\./examples/' docs/getting-started/next-steps.md`

## links-into-guides
**Description**: links into Guides
**Command**: `grep -qE '\(/guides/|\(\.\./guides/' docs/getting-started/next-steps.md`

## links-into-reference
**Description**: links into Reference
**Command**: `grep -qE '\(/reference/|\(\.\./reference/' docs/getting-started/next-steps.md`

## short
**Description**: <=350 words (this is a hub, not a topic)
**Command**: `wc -w docs/getting-started/next-steps.md | awk '{exit ($1<=350?0:1)}'`