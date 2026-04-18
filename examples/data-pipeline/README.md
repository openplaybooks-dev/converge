# Data Pipeline

Sequential pipeline with task dependencies: fetch → transform → validate.

## Structure

```
.converge/playbooks/default/
├── playbook.yml
└── tasks/
    ├── fetch-data/
    │   └── TASK.md       # Fetch raw data
    ├── transform/
    │   └── TASK.md       # Add grade field
    └── validate/
        └── TASK.md       # Validate output
```

## Demonstrates

- Task dependencies (`depends_on`)
- Inputs and outputs
- Multiple checks per task

## Run

```bash
converge run
```
