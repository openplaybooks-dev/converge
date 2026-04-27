---
title: "converge plan"
description: "Generate a playbook from a one-line goal."
sidebar:
  order: 2
---

Take a natural-language goal and produce a structured playbook (`.converge/playbooks/<name>/`) with phases, tasks, and checks. The same surface as the `converge-planning` Claude Code skill, but invoked from the CLI.

## Usage

```bash
converge plan <prompt> [options]
converge plan --prompt="Build a REST API"
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--prompt=TEXT` | first positional arg | What to build. |
| `--name=NAME` | derived from prompt | Name for the generated playbook. |
| `--update` | off | Update an existing playbook instead of creating new. |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
# Generate a fresh playbook.
converge plan "Build a React dashboard with auth"

# Explicit name, generated under .converge/playbooks/api-backend/.
converge plan --prompt="REST API" --name=api-backend

# Modify an existing playbook in place.
converge plan --prompt="Add dark mode" --update
```

## What it produces

A new directory at `.converge/playbooks/<name>/`:

```
playbooks/<name>/
├── playbook.yml          # phases, run mode, project-level checks
└── tasks/
    ├── 01-prepare/TASK.md
    ├── 02-design/TASK.md
    └── ...               # one folder per phase
```

Each `TASK.md` has frontmatter declaring `id`, `outputs`, `checks`, and a body prompt — the contract the `run` command then satisfies.

## After `plan`

```bash
# Review what was generated.
converge playbook info <name>

# Run it.
converge run --playbook=<name>
```

Treat the generated playbook as a draft. Edit task prompts, tighten checks, or restructure phases before running on anything important. The generator works from a one-line goal — it can't know all your constraints.

## Caveats

- `--update` only refines existing tasks; it doesn't restructure phases. To change phase shape, edit `playbook.yml` by hand or `reset` and re-`plan`.
- Generated checks are reasonable defaults. Review them — see [From your problem to a playbook](/getting-started/from-problem-to-playbook) for the discipline of writing checks that mean something.
