---
title: "converge add"
description: "Create a playbook from a prompt, example, or GitHub repo."
sidebar:
  order: 2
---

Create a new playbook in the current project. Three sources: generate from a prompt, copy a built-in example, or clone from GitHub.

## Usage

```bash
converge add [options]
```

Without options, runs interactively and prompts for source and name.

## Sources (choose one)

| Flag | Effect |
|---|---|
| `--from-prompt="..."` | Generate a playbook from a natural-language description. The AI decomposes the goal into tasks, writes TASK.md files, declares dependencies, and adds shell-level checks. |
| `--from-example=NAME` | Copy a built-in example playbook. Run `converge add --help` for the list. |
| `--from-github=USER/REPO` | Clone a playbook from a GitHub repository. Supports `user/repo`, `user/repo/subdir`, or full URL. |

## Options

| Flag | Default | Effect |
|---|---|---|
| `--name=NAME` | inferred from source | Playbook name. |
| `--force` | off | Overwrite existing playbook directory. |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
# Interactive mode.
converge add

# Generate from a prompt.
converge add --from-prompt "Build a blog with Next.js"
converge add --from-prompt "Literature review on in-context learning"

# Copy a built-in example.
converge add --from-example hello-world
converge add --from-example deep-research --name=my-research

# Clone from GitHub.
converge add --from-github user/my-playbook
```

## When to use

- **`--from-prompt`** to scaffold a new playbook from scratch. This is the main path — describe what you want in natural language and get a full playbook tree.
- **`--from-example`** to start from a known working playbook. Good for learning or bootstrapping.
- **`--from-github`** to reuse a playbook someone else wrote.
