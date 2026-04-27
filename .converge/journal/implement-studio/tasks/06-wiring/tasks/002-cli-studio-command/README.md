# Task Journal: 06-wiring/002-cli-studio-command

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
  test -f packages/cli/src/commands-studio.ts
  grep -q 'commands-studio\|runStudio' packages/cli/src/main.ts
  node -e "const p=require('./packages/cli/package.json');process.exit(p.optionalDependencies&&p.optionalDependencies['@converge/studio']?0:1)"
  pnpm --filter @converge/cli build 2>&1 | tail -3 && node packages/cli/dist/index.js studio --help 2>&1 | grep -qi studio
```