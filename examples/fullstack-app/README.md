# Fullstack App

CLI-seeded playbook that dynamically spawns backend + frontend component tasks at runtime. Demonstrates the diverge → execute → converge pattern for application generation.

## What it demonstrates

- Dynamic task generation via `seed: { mode: cli }`
- A parent task that emits `converge spawn task` / `converge spawn template` commands
- Parent/child orchestration where the DAG grows to fit the problem

## Setup

```bash
export MINIMAX_API_KEY=sk-...      # see .env.example at the repo root
```

The bundled `.converge/project.yaml` routes Claude through MiniMax's Anthropic-compatible endpoint (`MiniMax-M2.7`). Override with `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` to use a different provider.

## Run

```bash
cd examples/fullstack-app
converge run
```

## Structure

```
.converge/
├── project.yaml                 # AI provider (MiniMax via Claude CLI)
└── playbooks/default/
    ├── playbook.yml
    └── tasks/scaffold/TASK.md   # parent — emits `converge spawn ...` commands
```
