# Task Journal: 01-vendor/001-clone-prune

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
  test -d packages/converge-studio/src/app && test -f packages/converge-studio/next.config.mjs -o -f packages/converge-studio/next.config.js
  ! test -d packages/converge-studio/prisma && test -z "$(grep -l '@prisma' packages/converge-studio/package.json 2>/dev/null)"
  test -z "$(find packages/converge-studio/src -type d \( -iname 'openclaw' -o -iname 'crewai' -o -iname 'langgraph' -o -iname 'autogen' \) 2>/dev/null)"
  test -s packages/converge-studio/UPSTREAM_SHA && grep -qE '^[0-9a-f]{7,40}' packages/converge-studio/UPSTREAM_SHA
```