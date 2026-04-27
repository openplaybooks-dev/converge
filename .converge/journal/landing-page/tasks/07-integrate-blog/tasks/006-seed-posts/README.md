# Task Journal: 07-integrate-blog/006-seed-posts

## Current attempt — `attempts/03/`

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
  test -f apps/landing/src/content/blog/introducing-converge.mdx && test -f apps/landing/src/content/blog/from-langgraph-to-goal-driven.mdx
  for f in apps/landing/src/content/blog/introducing-converge.mdx apps/landing/src/content/blog/from-langgraph-to-goal-driven.mdx; do test -f "$f" && head -20 "$f" | grep -q '^title:' && head -20 "$f" | grep -q '^date:' || exit 1; done
  test -f apps/landing/package.json && pnpm --filter @converge/landing build >/dev/null 2>&1 && grep -q 'introducing-converge' apps/landing/dist/rss.xml && grep -q 'from-langgraph-to-goal-driven' apps/landing/dist/rss.xml
  test -f apps/landing/src/content/blog/introducing-converge.mdx && grep -q 'Define done. Converge gets there.' apps/landing/src/content/blog/introducing-converge.mdx
```