# Task Journal: 02-source-scan

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
  test -f docs/_sources.json && node -e "JSON.parse(require('fs').readFileSync('docs/_sources.json','utf8'))"
  node -e "const s=require('./docs/_sources.json');process.exit(Array.isArray(s.cli)&&s.cli.length>0?0:1)"
  node -e "const s=require('./docs/_sources.json');process.exit(Array.isArray(s.core)&&s.core.length>0?0:1)"
  node -e "const s=require('./docs/_sources.json');process.exit(Array.isArray(s.troubleshooting)&&s.troubleshooting.length>0?0:1)"
  test -f docs/_cli-commands.json && node -e "const c=require('./docs/_cli-commands.json');process.exit(c.length>=10?0:1)"
  test -f docs/_examples.json && node -e "const e=JSON.parse(require('fs').readFileSync('docs/_examples.json','utf8'));process.exit(Array.isArray(e)&&e.length>=15?0:1)"
  node -e "const e=JSON.parse(require('fs').readFileSync('./docs/_examples.json','utf8'));const ok=e.every(x=>x.slug&&x.category&&typeof x.hasReadme==='boolean'&&typeof x.hasPlaybook==='boolean');process.exit(ok?0:1)"
```