---
title: "converge init"
description: "Initialize a new converge project with .converge/ scaffolding."
sidebar:
  order: 1
---

Scaffold a new project. Creates `.converge/project.yaml` with AI provider config and a `.gitignore`. The interactive wizard can choose a provider template, enabled agents, the default agent, and optionally install bundled Converge skills for Claude Code and Codex.

## Usage

```bash
converge init                       # interactive wizard (default)
converge init --yes                 # accept all defaults
converge init [name] [options]      # prefill answers
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--name=NAME` | current dir name | Project name. |
| `--description=DESC` | (empty) | One-line project description. |
| `--backend=NAME` | `claude` | Agent CLI / host backend. Valid: `claude`, `codex`, `gemini`, `kimi`, `qwen`, `acp`, `deepcode`. |
| `--provider=NAME` | backend's default | LLM inference endpoint the backend talks to. Valid: `anthropic-oauth`, `anthropic`, `openai`, `kimi`, `qwen`, `gemini`, `minimax`, `deepseek`, `custom`. Availability depends on `--backend`. |
| `--agents=LIST` | `[backend]` | Comma-separated extra backends to enable (multi-agent). Valid: `claude`, `acp`, `kimi`, `qwen`, `gemini`, `codex`, `deepcode`. |
| `--default-agent=NAME` | `--backend` value | Which enabled backend is the default. |
| `--yes`, `-y` | off | Non-interactive. Accept defaults for all prompts. |
| `--force` | off | Overwrite an existing `.converge/` directory. **Destructive.** |
| `--skills` | off | Install bundled `converge-planning` and `converge-control` to `.claude/skills/` and `.codex/skills/`. |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
# Interactive: answers prompts for name, description, backend, provider.
converge init

# Non-interactive: name=cwd, backend=claude, provider=anthropic-oauth.
converge init --yes

# Pick a different backend (and its default provider).
converge init --backend=codex

# Claude routed via a cheap proxy — env baked into project.yaml.
converge init --backend=claude --provider=minimax
converge init --backend=claude --provider=deepseek

# Multi-backend with explicit default.
converge init --agents=claude,kimi --default-agent=claude

# Fully scripted.
converge init --name="Web App" --description="Full-stack app" --yes

# Scaffold plus bundled skills for Claude Code and Codex.
converge init --skills
```

## What it creates

```
<project>/
└── .converge/
    ├── project.yaml        # project metadata, AI provider config
    └── .gitignore          # ignores journal, logs, and other transient state
```

After `init`, create your first playbook with `converge add`. See [Your first playbook](/getting-started/your-first-playbook) for the manual path.

If `--skills` is set, Converge also installs:

- `converge-planning`
- `converge-control`

to both `.claude/skills/` and `.codex/skills/`.

If the project already exists, re-running `converge init --skills` installs bundled skills without re-scaffolding the whole workspace.

## Caveats

- `--force` deletes the existing `.converge/` directory. There is no recovery: back up first if you have any handwritten playbooks.
- Choosing providers at init only enables them in the config. You still need provider credentials in your environment (e.g. `ANTHROPIC_AUTH_TOKEN` for Claude).
