# Task Journal: 01-clone-and-rename/002-rename-package

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
  node -e "process.exit(require('./packages/studio/package.json').name==='@converge/studio'?0:1)"
  node -e "const p=require('./packages/studio/package.json');const d={...p.dependencies,...p.devDependencies};process.exit(d['@converge/core']==='workspace:*'&&d['@converge/project-root']==='workspace:*'?0:1)"
```