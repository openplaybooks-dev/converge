---
title: "Troubleshooting"
description: "Symptom-indexed fixes for current Converge runs."
sidebar:
  order: 0
---

Symptom-indexed fixes for the runtime that ships today. The source of truth for behavior is the journal and the current CLI, not the older proposal docs.

## Start with the journal

When a run goes wrong, inspect:

- `.converge/journal/<playbook>/manifest.json`
- `.converge/journal/<playbook>/runstate.json`
- the failing task's journal/attempt files

These files tell you what compiled, what ran, and what the runner believes is pending, complete, blocked, or failed.

## Common failure shapes

### Compile succeeded, but a task never runs

Check:

- the task exists in `manifest.json`
- upstream dependencies are complete
- the task is not excluded by `--select` / `--exclude`
- required inputs exist where the task declares them

### Task fails checks repeatedly

Usually one of:

- the task body is insufficient for the declared checks
- the checks point at stale paths
- the environment is missing a tool or dependency

Fix the task contract or the environment, then run again.

### Compile artifacts are not where you expected

Current behavior:

- `converge compile` writes `manifest.json` and `runstate.json` to `.converge/journal/<playbook>/`
- it does **not** write `target/manifest.json`

If you were looking for `target/`, you are reading older proposal material, not current runtime docs.

### Dynamic child work is missing

Current dynamic-task contract:

- declare `mode: spawner` (one-shot fan-out) or `mode: converger` (multi-wave loop) in the parent's frontmatter
- the body calls `converge spawn <id> <template> --var key=value...` per child — framework expands templates and applies (RFC 0024)
- the framework runs preview→apply after the body (default; controlled by `spawn.apply: auto`). Per-child failures land in `$CONVERGE_SPAWN_DIR/STATUS.md` as `- [ ]` rows with `fix:` blocks the repair loop can apply verbatim.

If the playbook still talks about `seed: { mode: cli }`, `seed.js`, `from_seed:`, or `compile --seed`, that playbook is stale: the parser will throw a migration error pointing at RFC 0021/0022/0024.

## When none of these match

Capture:

- the exact command you ran
- the relevant journal paths
- the failing task ID
- the exact error or check output

Then inspect the current task definition and journal artifacts before changing broader playbook structure.
