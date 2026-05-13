---
id: "{{taskId}}-verify"
title: "Verify — Sprint {{epoch}}"
description: "Verify implementation, run goal checks, update backlog."
depends_on:
  - "{{implTaskId}}"
inputs:
  - "{{artifactDir}}/diff.txt"
  - "{{artifactDir}}/plan.md"
  - "{{goalsPath}}"
  - "{{tasksPath}}"
vars:
  epoch: "{{epoch}}"
  goalId: "{{goalId}}"
  goalDesc: "{{goalDesc}}"
  goalsPath: "{{goalsPath}}"
  tasksPath: "{{tasksPath}}"
  ideaPath: "{{ideaPath}}"
  hasStaticGoals: "{{hasStaticGoals}}"
  artifactDir: "{{artifactDir}}"
outputs:
  - "{{artifactDir}}/result.json"
checks:
  - id: result-written
    cmd: test -s "{{artifactDir}}/result.json"
---

# Sprint Verification — {{goalDesc}}

## 1. Run project checks
```bash
pnpm build 2>&1 || true
pnpm test 2>&1 || true
```

## 2. Run goal checks

**Dynamic goals (goals.jsonl):** Read `{{goalsPath}}`, find goal `"{{goalId}}"`, run each check in its `checks` array. Goal satisfied when ALL pass.

**Static goals (playbook.yml):** Skip — the seed uses `ctx.goals.evaluate()`.

## 3. Write result
`{{artifactDir}}/result.json`: `{"epoch":"{{epoch}}","goalId":"{{goalId}}","built":"...","checksPassed":N,"checksTotal":N,"allPassed":true/false,"timestamp":"<ISO>"}`

## 4. Update backlog

Read `{{tasksPath}}` (JSONL). Mark the active task `"done"` with `"completedAt"`. Activate the next pending task for this goal.

If ALL tasks done AND checks passed: mark goal `"done"` in `{{goalsPath}}`, activate next pending goal.

## 5. Adaptive: Discover new strategy goals

After foundation goals (data pipeline, dashboard, scanners, backtest engine) are
built, switch to **adaptive mode**. Each epoch's verify phase should analyze
whether new strategies are worth investigating:

1. Read the current data in SQLite (markets, prices, signals).
2. Look for profitable patterns not yet covered by existing goals.
3. For EACH promising strategy, append a new goal to `{{goalsPath}}`:
```jsonl
{"id":"strategy-<name>","desc":"<strategy description with entry/exit rules>","status":"pending","checks":[{"id":"backtest","cmd":"node scripts/backtest.mjs --strategy <name> --days 90 | grep -q 'Sharpe > 1.0'"},{"id":"profitable","cmd":"sqlite3 data/polymarket.db \"SELECT profit_factor FROM backtest_results WHERE strategy='<name>'\" | grep -v '^0.'"}]}
```
4. Each strategy becomes a sprint — plan → implement → backtest → verify.
5. Strategies with Sharpe < 0.5 or profit factor < 1.0 are marked `"rejected"`.
6. Strategies with Sharpe > 1.5 are marked `"active"` and monitored.

The goal set grows adaptively as data reveals edges. The loop only stops when
no new strategies are discovered AND all existing ones are done or rejected.
