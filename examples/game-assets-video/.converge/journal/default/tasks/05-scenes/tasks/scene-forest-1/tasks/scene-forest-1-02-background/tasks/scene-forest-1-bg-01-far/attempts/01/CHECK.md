# Checks: 05-scenes/scene-forest-1/scene-forest-1-02-background/scene-forest-1-bg-01-far

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## scene-bg-png-exists
**Description**: Stitched background PNG exists for this layer
**Command**: `test -s assets/scenes/forest-1/bg-far.png`

## scene-bg-atlas-exists
**Description**: Single-frame atlas written (covers full sheet)
**Command**: `test -s assets/scenes/forest-1/bg-far.atlas.json`