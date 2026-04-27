# Checks: 00-visual-target

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## visual-target-png-exists
**Description**: visual-target.png was generated
**Command**: `test -s assets/visual-target.png`

## assets-md-has-size-column
**Description**: Every ASSETS.md table row has a numeric Size column
**Command**: `python -c "import re; md=open('ASSETS.md').read(); rows=[l for l in md.splitlines() if l.startswith('|') and '---' not in l]; bad=[l for l in rows[1:] if not re.search(r'\\d+\\s*[xX×]\\s*\\d+', l)]; assert not bad, f'rows missing pixel sizes: {bad[:3]}'"
`

## sprites-json-derived
**Description**: sprites.json was derived from ASSETS.md
**Command**: `test -s assets/sprites.json`