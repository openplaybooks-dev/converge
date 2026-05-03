---
title: "converge init"
description: "Initialize a new converge project with .converge/ scaffolding."
sidebar:
  order: 1
---

Scaffold a new project. Creates `.converge/` with `project.yml`, an empty `playbooks/` directory, and a `.gitignore`.

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
| `--agents=LIST` | `claude` | Comma-separated AI providers to enable. Valid: `claude`, `acp`, `kimi`, `qwen`, `gemini`. |
| `--default-agent=NAME` | first in `--agents` | Which enabled provider is the default. |
| `--yes`, `-y` | off | Non-interactive. Accept defaults for all prompts. |
| `--force` | off | Overwrite an existing `.converge/` directory. **Destructive.** |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
# Interactive — answers prompts for name, description, providers.
converge init

# Non-interactive — name=cwd, provider=claude.
converge init --yes

# Multi-provider with explicit default.
converge init my-app --agents=claude,kimi --default-agent=claude

# Fully scripted.
converge init --name="Web App" --description="Full-stack app" --yes
```

## What it creates

```
<project>/
└── .converge/
    ├── project.yml          # project metadata, AI provider config
    ├── playbooks/           # empty — populate with `converge init --from-prompt` or by hand
    └── .gitignore           # ignores journal, logs, and other transient state
```

After `init`, you're ready to either generate a playbook with `init --from-prompt` or hand-author one. See [Your first playbook](/getting-started/your-first-playbook) for the manual path.

## Caveats

- `--force` deletes the existing `.converge/` directory. There is no recovery — back up first if you have any handwritten playbooks.
- Choosing providers at init only enables them in the config. You still need provider credentials in your environment (e.g. `ANTHROPIC_API_KEY` for Claude).
