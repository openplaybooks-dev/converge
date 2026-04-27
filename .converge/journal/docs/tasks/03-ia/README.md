# Task Journal: 03-ia

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
  test -f docs/_ia.json && node -e "JSON.parse(require('fs').readFileSync('docs/_ia.json','utf8'))"
  node -e "const ia=require('./docs/_ia.json');const labels=ia.groups.map(g=>g.label);const required=['Getting Started','Examples','Guides','Troubleshooting','Reference','Concepts'];process.exit(required.every(r=>labels.includes(r))?0:1)"
  node -e "const ia=require('./docs/_ia.json');const gs=ia.groups.find(g=>g.label==='Getting Started');process.exit(Array.isArray(gs.pages)&&gs.pages.length===5?0:1)"
  node -e "const ia=require('./docs/_ia.json');const ex=ia.groups.find(g=>g.label==='Examples');const hasGlob=(ex.pages||[]).some(p=>p.kind==='glob'&&String(p.glob||'').startsWith('examples/'));process.exit(hasGlob?0:1)"
  node -e "const ia=require('./docs/_ia.json');const t=ia.groups.find(g=>g.label==='Troubleshooting');const hasGlob=(t.pages||[]).some(p=>p.kind==='glob'&&String(p.glob||'').startsWith('troubleshooting/'));process.exit(hasGlob?0:1)"
  node -e "const ia=require('./docs/_ia.json');const ref=ia.groups.find(g=>g.label==='Reference');const hasCliGlob=(ref.pages||[]).some(p=>p.kind==='glob'&&String(p.glob||'').startsWith('reference/cli/'));process.exit(hasCliGlob?0:1)"
  node -e "const ia=require('./docs/_ia.json');const allPages=ia.groups.flatMap(g=>g.pages||[]);const ok=allPages.every(p=>p.slug||p.glob);process.exit(ok?0:1)"
```