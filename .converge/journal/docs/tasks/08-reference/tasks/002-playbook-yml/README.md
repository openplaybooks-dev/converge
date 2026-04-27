# Task Journal: 08-reference/002-playbook-yml

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
  test -f docs/reference/playbook-yml.md
  grep -qE '^##\s+name|^###\s+name' docs/reference/playbook-yml.md && grep -qE '^##\s+tasks|^###\s+tasks' docs/reference/playbook-yml.md
  grep -qE '^##\s+checks|^###\s+checks' docs/reference/playbook-yml.md
  grep -qE '^name:.+\n.+description:' docs/reference/playbook-yml.md || grep -A20 '```yaml' docs/reference/playbook-yml.md | grep -q 'name:'
```