# Data Pipeline

Sequential data pipeline: **fetch → transform → validate**. The simplest demonstration of task dependencies and per-task checks.

## What it demonstrates

- Task dependencies via `depends_on`
- Per-task `inputs:` and `outputs:`
- Multiple shell-command `checks:` per task
- Goal-level convergence check (validated output exists)

## Setup

```bash
export MINIMAX_API_KEY=sk-...      # see .env.example at the repo root
```

The bundled `.converge/project.yaml` routes Claude through MiniMax's Anthropic-compatible endpoint (`MiniMax-M2.7`). Override with `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` to use a different provider.

## Run

```bash
cd examples/data-pipeline
converge run
```

## Structure

```
.converge/
├── project.yaml                 # AI provider (MiniMax via Claude CLI)
└── playbooks/default/
    ├── playbook.yml
    └── tasks/
        ├── fetch-data/TASK.md      # Fetch raw data
        ├── transform/TASK.md       # Add grade field
        └── validate/TASK.md        # Validate output
```
