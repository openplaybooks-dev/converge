# Task Journal: 02-bootstrap-astro/003-install-integrations

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
  test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit((all['@tailwindcss/vite']||all['@astrojs/tailwind']||all['tailwindcss'])?0:1)"
  test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@astrojs/mdx']?0:1)"
  test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@astrojs/sitemap']?0:1)"
  test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@astrojs/rss']?0:1)"
  test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@astrojs/starlight']?0:1)"
  test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@astrojs/cloudflare']?0:1)"
  test -f apps/landing/package.json && test -d apps/landing/node_modules && test -d apps/landing/node_modules/astro
```