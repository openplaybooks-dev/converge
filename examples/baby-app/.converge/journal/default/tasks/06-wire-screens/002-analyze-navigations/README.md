# Task Journal: 06-wire-screens/002-analyze-navigations

## Current attempt — `attempts/01/`

| File | Purpose |
|------|---------|
| `NEEDS.md` | Needs spec (inputs, outputs, checks defined) |
| `NEEDS.result.md` | Input evaluation (files found, blocked/ready) |
| `TASK.md` | Task instructions for the AI |
| `CHECK.md` | Check spec (ids, commands) |
| `CHECK.result.md` | Check outcomes after execution (pass/fail, output state) |
| `LEARN.md` | Failure analysis from previous attempt (attempt 2+) |
| `data/needs.json` | Machine-readable needs (inputs, outputs, blocked state) |
| `data/check.json` | Machine-readable check definitions |
| `data/facts.json` | Facts collected during execution |

## How to run / resume

```bash
pnpm converge run --step   # run next pending task
pnpm converge run          # run all remaining tasks
```

## Verify checks manually

```bash
  test -f navigations.json
  node -e "const n=JSON.parse(require('fs').readFileSync('navigations.json','utf-8')); process.exit(n.screens && n.screens.length >= 5 ? 0 : 1)"
  node -e "const n=JSON.parse(require('fs').readFileSync('navigations.json','utf-8')); const total=n.screens.reduce((s,sc)=>s+sc.elements.length,0); process.exit(total >= 10 ? 0 : 1)"
  node -e "const n=JSON.parse(require('fs').readFileSync('navigations.json','utf-8')); const ok=n.screens.every(s=>s.elements.every(e=>e.elementId)); process.exit(ok ? 0 : 1)"
```