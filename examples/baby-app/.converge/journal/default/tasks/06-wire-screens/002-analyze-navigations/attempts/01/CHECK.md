# Checks: 06-wire-screens/002-analyze-navigations

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## manifest-exists
**Description**: navigations.json was created
**Command**: `test -f navigations.json`

## manifest-has-screens
**Description**: Manifest contains at least 5 screens
**Command**: `node -e "const n=JSON.parse(require('fs').readFileSync('navigations.json','utf-8')); process.exit(n.screens && n.screens.length >= 5 ? 0 : 1)"`

## manifest-has-elements
**Description**: Manifest contains at least 10 interactive elements total
**Command**: `node -e "const n=JSON.parse(require('fs').readFileSync('navigations.json','utf-8')); const total=n.screens.reduce((s,sc)=>s+sc.elements.length,0); process.exit(total >= 10 ? 0 : 1)"`

## every-element-has-id
**Description**: Every element has a unique elementId
**Command**: `node -e "const n=JSON.parse(require('fs').readFileSync('navigations.json','utf-8')); const ok=n.screens.every(s=>s.elements.every(e=>e.elementId)); process.exit(ok ? 0 : 1)"`