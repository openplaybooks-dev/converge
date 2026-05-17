# Social Sim

Persona-driven OASIS-style social simulation. Each "tick" spawns child tasks that advance the state of a persistent cast of personas — alliances form, events fire, the world remembers.

## What it demonstrates

- `run: { mode: loop }` — iterative epochs that accumulate state
- Per-tick dynamic child task spawning
- Persistent state in `vault/` that survives across runs
- Run journal under `runs/` with reproducible epoch snapshots

## Setup

```bash
export MINIMAX_API_KEY=sk-...      # see .env.example at the repo root
```

The bundled `.converge/project.yaml` routes Claude through MiniMax's Anthropic-compatible endpoint (`MiniMax-M2.7`). Override with `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` to use a different provider.

## Run

```bash
cd examples/social-sim
converge run
```

## Structure

```
.converge/
├── project.yaml                 # AI provider (MiniMax via Claude CLI)
└── playbooks/social-sim/
    ├── playbook.yml             # loop-mode epoch driver
    └── tasks/                   # per-tick task templates

vault/                           # persistent persona + world state
runs/                            # per-run epoch snapshots
```
