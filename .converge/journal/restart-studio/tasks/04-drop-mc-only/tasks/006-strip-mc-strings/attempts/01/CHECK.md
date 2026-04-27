# Checks: 04-drop-mc-only/006-strip-mc-strings

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## no-mission-control-in-messages
**Description**: Literal "Mission Control" not in messages/
**Command**: `test -z "$(grep -ril 'mission control' packages/studio/messages 2>/dev/null)"`

## marker-written
**Description**: A marker file recording the strip is written
**Command**: `test -f .converge/studio-state/stripped-mc-strings.txt`