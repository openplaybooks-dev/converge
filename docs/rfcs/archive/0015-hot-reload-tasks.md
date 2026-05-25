---
rfc: 0015
title: Hot-reload TASK.md edits
status: withdrawn
type: feat
source: human
priority_tier: tier2
estimate: "1 week"
backwards_compatible: yes
risk: medium
---
# RFC 0015: Hot-reload TASK.md edits

## Problem

In a long-running playbook, you'll discover a bug in template T. You shouldn't have to kill the run, fix, restart, and re-walk the cached prefix. (In baby-app I had to do this.) The runtime should detect TASK.md edits and apply them to not-yet-started tasks.

## Proposal

`converge run --watch` (or always-on with `runtime.watchPlaybook: true` in project.yml) starts an mtime watcher on `.converge/playbooks/`. On change:

1. Re-validate the changed file. If invalid → log warning, skip.
2. Re-compile the affected portion of the DAG.
3. Mark already-started tasks with the old version as `stale-source` (info-only; they keep running).
4. Use the new content for any task not yet started.
5. For dynamically-spawned children whose template changed: same — those not yet leased will use the new template; in-flight ones complete on the old.

## Code-level design

- New module: `packages/core/src/runtime/watcher.ts`.
- Use `fs.watch` or `chokidar`.
- Debounce 500ms — wait for editor save bursts to settle.
- Re-validate via existing validation pipeline.

### Edit categories

| Edit | Effect |
|---|---|
| Body text of a TASK.md | Hot-applied to not-yet-started tasks |
| `checks:` in frontmatter | Re-runs checks on next attempt of running tasks |
| `outputs:` in frontmatter | Re-validates after task completes |
| `depends_on:` | Requires re-compile; pauses dispatch, re-walks DAG, resumes |
| `seed:` | Pauses dispatch, re-renders seeds, resumes |

## Implementation steps

1. Watcher with debounce.
2. Hot-swap logic for body/checks/outputs (in-place update).
3. Re-compile path for `depends_on`/`seed` changes.
4. Surface "stale-source" status in the gantt view (RFC 0011).
5. CLI flag.

## Test plan

1. Edit a task's body mid-run → next attempt uses new body.
2. Add a check to a running task → next attempt enforces it.
3. Modify `depends_on` → DAG re-compiled, frontier updated.
4. Edit then immediately revert → debounced; no thrash.

## Out of scope

- Hot-reload of project.yml (provider config changes mid-run is risky).
- Hot-reload of SKILL.md files (could be RFC follow-up).
- A separate "edit history" feature.
