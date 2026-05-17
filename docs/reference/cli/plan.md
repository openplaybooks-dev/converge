---
title: "converge plan"
description: "Generate or update playbook plans from a prompt or an existing node path."
sidebar:
  order: 12
---

Plan work before running it.

`converge plan` has two modes:

- **Prompt mode**: create a fresh plan from a natural-language prompt
- **Path mode**: re-plan an existing playbook root or task directory

## Usage

```bash
converge plan -p "Your plan description"
converge plan <path> [-p "refinement prompt"] [--update]
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `-p`, `--prompt="..."` | none | Natural-language planning prompt. |
| `--update` | off | Update an existing plan instead of treating it as fresh planning. |
| `--name=NAME` | inferred | Playbook name in prompt mode. |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
converge plan -p "Build a research playbook for model evals"
converge plan .converge/playbooks/default --update
converge plan .converge/playbooks/default/tasks/03-build -p "Split frontend and backend more cleanly"
```

## Output

- prompt mode writes a new playbook plan through the planner pipeline
- path mode writes `PLAN.md` at the targeted node

If the target is a playbook root, the command prints the follow-up `converge run --playbook=<name>` hint when planning succeeds.

