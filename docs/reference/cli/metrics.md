---
title: "converge metrics"
description: "Aggregate cost, duration, token, and model usage from journal data."
sidebar:
  order: 13
---

Extract execution metrics from `.converge/journal/`.

Use this when you want cost, duration, token, tool, or model breakdowns across one playbook or the whole workspace.

## Usage

```bash
converge metrics [options]
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--playbook=NAME` | all playbooks | Scope metrics to one playbook. |
| `--by-epic` | off | Group output by epic. |
| `--by-task` | off | Group output by task. |
| `--by-model` | off | Group output by model. |
| `--top=N` | none | Show top N most expensive sessions. |
| `--json` | off | Emit JSON instead of human-readable output. |
| `--save` | off | Write metrics output to journal files where supported. |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
converge metrics
converge metrics --playbook=deep-research
converge metrics --by-model --top=5
converge metrics --playbook=game-assets --json
```

## Notes

- Metrics use journal data, not live process state.
- If your project defines custom pricing in `.converge/project.yaml`, those values are used when provider-side cost is missing.
- The related `show metrics` view is the visualization-oriented entrypoint; this command is the direct metrics extractor.

