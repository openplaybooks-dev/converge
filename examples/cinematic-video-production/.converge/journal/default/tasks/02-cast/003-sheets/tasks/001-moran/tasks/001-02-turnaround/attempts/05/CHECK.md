# Checks: 02-cast/003-sheets/001-moran/001-02-turnaround

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## turnaround-exists
**Description**: Turnaround image generated
**Command**: `test -s characters/moran/turnaround.png`

## turnaround-seed-recorded
**Description**: Generation seed recorded for future reruns
**Command**: `test -s characters/moran/turnaround.seed.txt`