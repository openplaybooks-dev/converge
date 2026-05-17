---
title: "converge stop"
description: "Stop an active playbook run and remove its run lock."
sidebar:
  order: 9
---

Stop an active run for a playbook. This command reads the playbook's run lock, checks whether the recorded PID is still alive, and then removes the lock.

Use this when a long-running `converge run` is stuck, orphaned, or needs to be cancelled from another shell.

## Usage

```bash
converge stop [options]
```

## Options

| Flag | Default | Effect |
|---|---|---|
| `--playbook=NAME` | `default` or `CONVERGE_PLAYBOOK` | Which playbook run to stop. |
| `--dir=PATH` | cwd | Project directory. |

## Examples

```bash
converge stop
converge stop --playbook=deep-research
converge stop --dir=examples/game-assets
```

## Behavior

- If the PID in the run lock is still alive, the command reports that it stopped the run.
- If the PID is dead, the command removes the stale lock and reports that instead.
- If no run lock exists, the command exits successfully and prints that nothing is active.

