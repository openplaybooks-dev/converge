# Example: Continuous Playbook

A long-lived playbook that builds a Todo app. Tasks are authored upfront,
some use WBS to spawn subtasks. Run it repeatedly — each run picks up
where the last left off.

## Structure

```
.harness/playbooks/default/
├── playbook.yml           ← 3-phase pipeline + run config
├── tasks/
│   ├── 01-setup/TASK.md   ← project init
│   ├── 02-build/          ← WBS parent: spawns per-component tasks
│   │   ├── TASK.md
│   │   └── wbs.js
│   └── 03-test/TASK.md    ← write tests
└── goals/
    └── 001-builds-clean/  ← convergence goal
```

## Usage

```bash
harness run                  # first run
harness run                  # resumes from where it left off
harness run --converge       # run until goals pass
harness tree                 # see task tree
```
