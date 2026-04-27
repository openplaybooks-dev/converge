# Task Journal: 06-guides/004-build-a-software-project

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
  test -f docs/guides/build-a-software-project.md
  head -10 docs/guides/build-a-software-project.md | grep -q '^title:' && head -10 docs/guides/build-a-software-project.md | grep -q '^sources:'
  grep -qE 'flutter-app|fullstack-app|stitch-to-flutter' docs/guides/build-a-software-project.md
  grep -qE 'playbook\.yml|^\s*name:' docs/guides/build-a-software-project.md
  grep -qE 'TASK\.md' docs/guides/build-a-software-project.md
  test -f docs/guides/build-a-software-project.md && wc -w docs/guides/build-a-software-project.md | awk '{exit ($1>=800&&$1<=1800?0:1)}'
```