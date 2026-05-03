# Fullstack App

Seed-driven playbook that dynamically spawns component tasks.

## Structure

```
.converge/playbooks/default/
├── playbook.yml
└── tasks/
    └── scaffold/
        ├── TASK.md       # Parent task with Seed
        └── seed.js        # Spawns backend + frontend tasks
```

## Demonstrates

- Seed scripting (`seed.js`)
- Dynamic task generation via `ctx.spawn()`
- Complex orchestration with parent/child tasks

## Run

```bash
converge run
```
