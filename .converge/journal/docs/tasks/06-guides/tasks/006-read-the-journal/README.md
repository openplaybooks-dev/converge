# Task Journal: 06-guides/006-read-the-journal

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
  test -f docs/guides/read-the-journal.md
  head -10 docs/guides/read-the-journal.md | grep -q '^title:' && head -10 docs/guides/read-the-journal.md | grep -q '^sources:'
  grep -qE '\.converge/journal' docs/guides/read-the-journal.md
  grep -qE 'LEARN\.md' docs/guides/read-the-journal.md
  grep -qE 'cat|jq|tail|less' docs/guides/read-the-journal.md
  test -f docs/guides/read-the-journal.md && wc -w docs/guides/read-the-journal.md | awk '{exit ($1>=600&&$1<=1500?0:1)}'
```