# Fullstack App

CLI-seeded playbook that dynamically spawns component tasks.

## Structure

```
.converge/playbooks/default/
├── playbook.yml
└── tasks/
    └── scaffold/
        └── TASK.md       # Parent task emits `converge spawn ...` commands
```

## Demonstrates

- `seed: { mode: cli }`
- Dynamic task generation via `converge spawn task` / `converge spawn template`
- Complex orchestration with parent/child tasks

## Run

```bash
converge run
```
