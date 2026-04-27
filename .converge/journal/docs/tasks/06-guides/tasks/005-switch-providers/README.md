# Task Journal: 06-guides/005-switch-providers

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
  test -f docs/guides/switch-providers.md
  head -10 docs/guides/switch-providers.md | grep -q '^title:' && head -10 docs/guides/switch-providers.md | grep -q '^sources:'
  grep -qiE 'claude' docs/guides/switch-providers.md && grep -qiE 'gemini|kimi|qwen|openrouter' docs/guides/switch-providers.md
  grep -qE 'project\.yml|^ai:' docs/guides/switch-providers.md
  test -f docs/guides/switch-providers.md && wc -w docs/guides/switch-providers.md | awk '{exit ($1>=600&&$1<=1500?0:1)}'
```