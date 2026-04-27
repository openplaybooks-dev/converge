# Task Journal: 03-rebind-ui/006-rebind-playbook-detail

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
  test -f 'packages/studio/src/app/playbooks/[name]/page.tsx'
  test -f packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Overview' packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Tasks' packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Runs' packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Config' packages/studio/src/components/playbook-detail-tabs.tsx
```