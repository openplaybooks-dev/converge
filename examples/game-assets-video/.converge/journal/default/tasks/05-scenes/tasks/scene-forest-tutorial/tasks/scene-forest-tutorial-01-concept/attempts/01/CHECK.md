# Checks: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01-concept

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## scene-concept-png-exists
**Description**: Scene concept image written
**Command**: `test -s assets/scenes/forest-tutorial/concept.png`

## scene-spec-has-content
**Description**: SPEC.md has body text (not an empty stub)
**Command**: `python -c "import pathlib; t = pathlib.Path('assets/scenes/forest-tutorial/SPEC.md').read_text(encoding='utf-8'); assert len(t) > 200, f'SPEC.md too short ({len(t)} chars)'"
`