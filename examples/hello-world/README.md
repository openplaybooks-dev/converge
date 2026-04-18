# Hello World

Simplest possible Converge playbook. Creates a file and verifies it exists.

## Structure

```
.converge/playbooks/default/
├── playbook.yml          # Playbook config
└── tasks/
    └── create-file/
        └── TASK.md       # Single task: create output.txt
```

## Run

```bash
converge run
```
