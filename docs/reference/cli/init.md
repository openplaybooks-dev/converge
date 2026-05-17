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
| `--provider-template=NAME` | `claude` | Provider preset used to seed `.converge/project.yaml`. Valid: `claude`, `codex`, `acp`, `kimi`, `qwen`, `gemini`, `deepcode`, `custom`. |
| `--agents=LIST` | preset default | Comma-separated AI providers to enable. Valid: `claude`, `acp`, `kimi`, `qwen`, `gemini`, `codex`, `deepcode`. |
| `--default-agent=NAME` | first in `--agents` | Which enabled provider is the default. |
| `--yes`, `-y` | off | Non-interactive. Accept defaults for all prompts. |
| `--force` | off | Overwrite an existing `.converge/` directory. **Destructive.** |
| `--skills` | off | Install bundled `converge-planning` and `converge-control` to `.claude/skills/` and `.codex/skills/`. |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
# Interactive: answers prompts for name, description, providers.
converge init

# Non-interactive: name=cwd, provider=claude.
converge init --yes

# Pick a different provider preset.
converge init --provider-template codex

# Multi-provider with explicit default.
converge init my-app --agents=claude,kimi --default-agent=claude

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
