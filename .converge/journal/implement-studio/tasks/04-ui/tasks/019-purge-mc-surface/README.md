# Task Journal: 04-ui/019-purge-mc-surface

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
  test ! -d 'packages/converge-studio/src/app/[[...panel]]'
  test ! -d 'packages/converge-studio/src/components/dashboard' && test ! -d 'packages/converge-studio/src/components/panels' && test ! -d 'packages/converge-studio/src/components/modals' && test ! -d 'packages/converge-studio/src/components/hud' && test ! -d 'packages/converge-studio/src/components/terminal' && test ! -d 'packages/converge-studio/src/components/chat' && test ! -d 'packages/converge-studio/src/components/onboarding'
  bash -c 'cd packages/converge-studio/src/components/layout && for f in nav-rail.tsx header-bar.tsx live-feed.tsx site-header.tsx local-mode-banner.tsx update-banner.tsx promo-banner.tsx openclaw-doctor-banner.tsx openclaw-update-banner.tsx; do test ! -f "$f" || { echo "$f still present"; exit 1; }; done'
  bash -c 'cd packages/converge-studio/src/lib && for pat in gateway- openclaw- onboarding- pty- websocket-; do for f in ${pat}*.ts; do [ "$f" = "${pat}*.ts" ] || { echo "$f still present"; exit 1; }; done; done'
  bash -c 'cd packages/converge-studio/src/app/api && allowed="playbooks runs run watch events"; for d in */; do d=${d%/}; case " $allowed " in *" $d "*) ;; *) echo "$d still present"; exit 1 ;; esac; done'
  pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq
```