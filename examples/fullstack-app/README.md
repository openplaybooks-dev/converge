# Fullstack App

WBS-driven playbook that dynamically spawns component tasks.

## Structure

```
.converge/playbooks/default/
├── playbook.yml
└── tasks/
    └── scaffold/
        ├── TASK.md       # Parent task with WBS
        └── wbs.js        # Spawns backend + frontend tasks
```

## Demonstrates

- WBS scripting (`wbs.js`)
- Dynamic task generation via `ctx.spawn()`
- Complex orchestration with parent/child tasks

## Run

```bash
converge run
```
