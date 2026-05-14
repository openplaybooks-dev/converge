# App Builder — Scrum-Based Goal-Driven Development

AI-powered app builder using scrum methodology. An idea becomes epics (goals),
epics become a backlog (tasks), and each epoch delivers one task. JSON artifacts
drive everything — no hardcoded logic, fully data-driven.

## How it works

```
idea.md                  goals.json              tasks.json               epochs
  │                         │                       │                       │
  └─→ AI decompose ────→  3-5 epics  ──→ AI ──→  20-30 items  ──→  one per epoch
                            │                       │
                            └── status auto-sync ───┘
                               (goal done when all
                                its tasks done)
```

1. **Sprint planning**: AI reads `idea.md` → creates `goals.json` (epics) → for each goal, creates `tasks.json` (backlog items)
2. **Sprint execution**: each epoch picks the first pending task, runs plan→implement→verify, marks it done
3. **Auto-completion**: when all tasks for a goal are done, the goal auto-completes
4. **Discovery**: new tasks found during delivery are appended to the backlog
5. **Done**: all tasks complete + AI confirms nothing missing → stop

## Epoch rhythm

Each epoch delivers one task in three phases:
| Phase | What happens |
|-------|-------------|
| **Plan** | Read codebase, write implementation plan |
| **Implement** | Build the feature, run checks locally |
| **Verify** | Run full check suite, mark task done, discover new tasks |

## Artifact-driven

Every piece of state is a JSON file — inspectable, reproducible, version-controllable:

```
.converge/artifacts/app-builder/
├── goals.json          # epics with status (pending → in-progress → done)
├── tasks.json          # backlog with checks + status per task
├── summary.md          # final convergence report
└── epochs/
    └── 001/
        ├── plan.md
        ├── diff.txt
        └── result.json
```

## What it will do
- Decompose any `idea.md` into structured goals and tasks
- Build features in dependency order
- Write real, working, tested code
- Discover new tasks as features reveal hidden work
- Produce a production-ready, demoable app

## What it won't do
- Build features not traceable to a task in `tasks.json`
- Continue indefinitely (bounded by `maxIterations: 30`, stall detection, 8h cap)
- Modify its own playbook files
- Ship dead features — every task has verifiable checks

## Run

```bash
cd examples/app-builder
converge run --playbook app-builder
```

Edit `idea.md` to build a different app. The playbook is reusable —
same process, different product.

## Structure

```
app-builder/
├── idea.md                         # your app spec (edit this!)
├── README.md
└── .converge/
    ├── project.yml
    └── playbooks/app-builder/
        ├── playbook.yml
        ├── tasks/build/
        │   ├── TASK.md
        │   └── seeds/epoch.seed.js
        └── templates/epoch/
            └── TASK.md
```
