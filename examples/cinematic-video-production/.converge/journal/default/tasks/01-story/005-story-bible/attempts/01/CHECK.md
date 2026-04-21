# Checks: 01-story/005-story-bible

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## bible-exists
**Description**: Story bible written and non-empty
**Command**: `test -s story-bible.md`

## bible-has-rules-section
**Description**: Story bible has a rules section
**Command**: `grep -qE '^## (World Rules|Universe Rules|Rules)' story-bible.md`