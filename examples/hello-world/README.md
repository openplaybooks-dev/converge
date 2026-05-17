# Hello World

The simplest possible Converge playbook. Creates a file and verifies it exists.

## What it demonstrates

- Minimal `playbook.yml` structure
- A single task with `outputs:` and `checks:`
- The smallest possible end-to-end run

## Setup

```bash
export MINIMAX_API_KEY=sk-...      # see .env.example at the repo root
```

The bundled `.converge/project.yaml` routes Claude through MiniMax's Anthropic-compatible endpoint (`MiniMax-M2.7`). Override with `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` to use a different provider.

## Run

```bash
cd examples/hello-world
converge run
```

## Structure

```
.converge/
├── project.yaml                 # AI provider (MiniMax via Claude CLI)
└── playbooks/default/
    ├── playbook.yml             # one task, one goal
    └── tasks/create-file/TASK.md
```
