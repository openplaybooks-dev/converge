---
id: "{{taskId}}-plan"
title: "Plan — Sprint {{epoch}}"
description: "Plan the sprint. Bootstrap: decompose idea.md into goals on first run."
vars:
  epoch: "{{epoch}}"
  goalId: "{{goalId}}"
  goalDesc: "{{goalDesc}}"
  goalsPath: "{{goalsPath}}"
  tasksPath: "{{tasksPath}}"
  ideaPath: "{{ideaPath}}"
  fileList: "{{fileList}}"
  summary: "{{summary}}"
  hasStaticGoals: "{{hasStaticGoals}}"
  artifactDir: "{{artifactDir}}"
outputs:
  - "{{artifactDir}}/plan.md"
checks:
  - id: plan-written
    cmd: test -s "{{artifactDir}}/plan.md"
---

# Sprint Planning — {{goalDesc}}

**Status:** {{summary}} | **Built:** {{fileList}}

## Bootstrap: first run with no goals?

If `{{hasStaticGoals}}` is "false" AND `{{goalsPath}}` has no goals yet (check with `cat`), this is the BOOTSTRAP epoch. You must:

1. Read `{{ideaPath}}` — the full project idea.
2. Decompose it into 3-5 goals with verification checks:
   ```bash
   echo '{"id":"g1","desc":"CLI foundation: scaffold, entry point, config, status","status":"active","checks":[{"id":"build","cmd":"pnpm build"},{"id":"help","cmd":"node bin/devpulse.js --help | grep -q Usage"}]}' >> {{goalsPath}}
   ```
   Goals format: `{"id":"g1","desc":"...","status":"active|pending|done","checks":[{"id":"...","cmd":"..."}]}`
   First goal `"active"`, rest `"pending"`.
3. Create 3-5 tasks for the first goal — ALL `"pending"`:
   ```bash
   echo '{"id":"g1-t1","goalId":"g1","desc":"Scaffold TypeScript project with pnpm","status":"pending"}' >> {{tasksPath}}
   ```

## Normal sprint (goals exist)

1. Read `{{goalsPath}}` and `{{tasksPath}}`.
2. Scan the codebase.
3. If the active goal has NO tasks yet, create 3-5 tasks for it — ALL `"pending"` (the seed activates one).
4. Write plan to `{{artifactDir}}/plan.md`:
   - **Goal**: what the active goal delivers
   - **This sprint**: one concrete deliverable for the active task
   - **Files to create/modify**
   - **Verification**: how to confirm this sprint is done

## Strategy research (adaptive mode)

Once data pipeline + dashboard + scanners are built, each sprint should also:
1. Query SQLite for recent signals and market data.
2. If profitable patterns exist that have NO corresponding goal in `{{goalsPath}}`,
   plan to create new strategy goals in the verify phase.
3. Prioritize strategies by: Sharpe ratio, sample size, category diversity.
