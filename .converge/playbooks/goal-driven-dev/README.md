# Goal-Driven Development

The reference example for goal-driven playbooks in Converge. Instead of prescribing
a workflow (do step 1, then step 2), you declare **goals with verifiable checks**.
The system figures out how to achieve them, one sprint at a time. Goals evolve
adaptively — as you learn more, new goals emerge.

## Goal Engineering vs. Workflow Engineering

Most playbooks prescribe **process**:

```
prepare → design → build → wire → ship
```

Goal-driven playbooks prescribe **outcomes**:

```
Goal: "Dashboard loads at /dashboard, shows 30-day trend chart, team heatmap"
Check: curl -s localhost:3000/dashboard | grep -q 'Team Health'
Check: npx playwright test tests/dashboard.spec.ts

→ System builds whatever is needed to make those checks pass.
```

| Workflow Engineering | Goal Engineering |
|---|---|
| "Step 3: build screens" | "Dashboard shows trend chart — verify with Playwright" |
| Breaks if the process changes | Adapts — only cares about passing checks |
| One product per pipeline | Same playbook, different idea.md = different product |
| AI follows instructions | AI reasons about outcomes |
| Fixed task list | Tasks created and evolved reactively |

## How It Works

```
idea.md                     goals.jsonl                  epochs
  │                             │                           │
  │  AI decomposes              │  6 goals with             │  one sprint each
  │  into goals ───────────→   │  shell checks       ───→  │  plan → implement
  │                             │                           │  → verify
  │                             │                           │
  │                             ├─ G1: data pipeline  ✓     │  epoch-001
  │                             ├─ G2: dashboard      ✓     │  epoch-002
  │                             ├─ G3: pattern scan   ✓     │  epoch-003
  │                             ├─ G4: backtest       ✓     │  epoch-004
  │                             ├─ G5: alpha research ✓     │  epoch-005
  │                             │                           │
  │                             │  ADAPTIVE PHASE           │
  │                             ├─ strategy-momentum ✓      │  epoch-006
  │                             ├─ strategy-arbitrage ✓     │  epoch-007
  │                             ├─ strategy-meanrev  ✓      │  epoch-008
  │                             └─ ... (grows adaptively)   │  epoch-N
  │                                                         │
  └─ All goals pass ───────────────────────────────────→  STOP
```

### Each sprint = plan → implement → verify

1. **Plan**: read current state (codebase, data, goals.jsonl, tasks.jsonl). Write a concrete sprint plan. Create tasks for the active goal if none exist.
2. **Implement**: build exactly what the plan specifies. Write real code. Run checks locally.
3. **Verify**: run the goal's deterministic checks. Update backlog. Discover new goals if the data reveals unexplored edges.

### Adaptive phase

After foundation goals are built, the system enters **adaptive mode**:

```
1. Query data → find pattern (e.g., momentum in crypto markets)
2. Create new goal → {"id":"strategy-momentum-crypto", "checks":[...]}
3. Sprint: implement strategy → backtest
4. Evaluate: Sharpe > 1.5 → keep active. Sharpe < 0.5 → reject.
5. Repeat: research → discover → create goal → implement → verify
```

The goal set grows organically. A playbook that starts with 6 foundation goals
may end with 30+ strategy goals, each independently verified.

## Declaring Goals

Goals live in `playbook.yml` (static foundation) or `goals.jsonl` (dynamic strategies):

```yaml
goals:
  - id: data-pipeline
    description: "Fetch Polymarket markets via API, store in SQLite"
    checks:
      - {id: markets-table, cmd: "sqlite3 data/polymarket.db 'SELECT COUNT(*) FROM markets' | grep -v '^0$'"}
      - {id: fetch-works, cmd: "node scripts/fetch-markets.mjs | grep -q 'markets fetched'"}
```

A goal is **done** when ALL its checks pass. No exceptions. No AI judgment.
Every check is a deterministic shell command — exit 0 = pass.

### What makes a good goal

- **`description`**: one sentence the AI can reason about — "Dashboard shows trend chart for team morale scores" not "Build dashboard"
- **`checks`**: 2-4 shell commands that prove the goal is met — test the UI (Playwright), test the API (curl), test the data (sqlite3), test the filesystem (test -f)
- **`depends_on`**: explicit dependencies so the AI knows build order
- **Discoverable**: when building G3, the AI may discover G7 is needed → appends it

## Project Structure

```
.converge/playbooks/goal-driven-dev/
├── playbook.yml              # goals declaration + run config
├── README.md                 # this file
├── tasks/build/              # root seed task (epoch loop driver)
│   ├── TASK.md
│   └── seeds/epoch.seed.js   # scrum seed: eval goals, spawn sprints
├── templates/epoch/          # sprint pipeline
│   ├── TASK.md               # container: convergence after children
│   ├── seeds/sprint.seed.js  # inner seed: spawns plan → implement → verify
│   └── tasks/
│       ├── plan/TASK.md      # plan phase: decompose, create tasks
│       ├── implement/TASK.md # build phase: write code
│       └── verify/TASK.md    # verify phase: run checks, update backlog
├── scripts/                  # production tooling
│   ├── verify-goal.mjs       # run all checks for one goal
│   ├── eval-all-goals.mjs    # run all goal checks, write goal-state.json
│   └── check-playbook-integrity.mjs  # validate all templates
└── tests/                    # reusable check definitions
```

## Running

```bash
# From project root with idea.md present:
converge run --playbook goal-driven-dev

# Edit idea.md to build a different product:
vim idea.md
converge run --playbook goal-driven-dev
```

Same playbook, different `idea.md` = different product. The methodology is
reusable — only the goals and idea change.

## Why This Scales

1. **Goal independence**: each goal declares dependencies and checks. AI knows what's blocked vs. buildable.
2. **Deterministic verification**: every check exits 0/non-zero. No AI judgment in the loop condition.
3. **Durable state**: goals.jsonl + tasks.jsonl + goal-state.json survive restarts and crashes.
4. **Reactive discovery**: building features reveals new features. The backlog grows adaptively.
5. **Outcome over process**: the system only cares that checks pass, not how they were achieved. This lets the AI adapt its approach sprint by sprint.
