---
title: "converge docs"
description: "Generate a self-contained HTML documentation artifact for a playbook."
sidebar:
  order: 20
---

Generate a single-file HTML site for a playbook.

This is the nearest analog to `dbt docs generate`: a shareable artifact for reading the playbook's structure without opening the repo or installing dependencies.

## Usage

```bash
converge docs [options]
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--playbook=NAME` | auto-detect / env | Which playbook to document. |
| `--out=PATH` | `.converge/docs/<playbook>.html` | Output file path. |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
converge docs --playbook=default
converge docs --playbook=deep-research --out=artifacts/deep-research.html
```

## Output contents

- playbook header and metadata
- task index
- per-task details
- rendered `TASK.md` bodies
- dependency summary
- template previews for `TASK.md.tpl` files

The output is self-contained HTML with no external JS or CSS dependencies.

