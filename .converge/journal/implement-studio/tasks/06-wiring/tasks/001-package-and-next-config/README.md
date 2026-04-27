# Task Journal: 06-wiring/001-package-and-next-config

## Current attempt — `attempts/02/`

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
  test -f packages/converge-studio/next.config.mjs
  grep -q '@converge/core' packages/converge-studio/next.config.mjs && grep -q 'transpilePackages' packages/converge-studio/next.config.mjs
  grep -q 'next-intl/plugin' packages/converge-studio/next.config.mjs && grep -q "./src/i18n/request" packages/converge-studio/next.config.mjs
  node -e "const p=require('./packages/converge-studio/package.json');const d={...p.dependencies,...p.devDependencies};process.exit(d['next-intl']&&d['next-themes']?0:1)"
  pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq
  bash -c 'cd packages/converge-studio && (pnpm dev > /tmp/converge-studio-dev.log 2>&1 &); pid=$!; for i in $(seq 1 30); do sleep 1; code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/ || echo 000); if [ "$code" = "200" ]; then kill $pid 2>/dev/null; exit 0; fi; done; kill $pid 2>/dev/null; cat /tmp/converge-studio-dev.log; exit 1'
```