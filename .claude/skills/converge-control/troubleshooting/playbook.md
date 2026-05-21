# Converge Troubleshooting Index

Quick reference for diagnosing and fixing Converge playbook issues. Each group contains related problems that benefit from being read together.

## Quick Index by Symptom

| Symptom | Group | Entry |
|---------|-------|-------|
| HTTP 401 / Invalid API key on first task | [E: Environment & Configuration](env-config.md) | E.3 |
| Foreign playbook hijacks `converge run` | [E: Environment & Configuration](env-config.md) | E.1, E.2 |
| Missing or malformed project.yaml | [E: Environment & Configuration](env-config.md) | E.4 |
| Stale `outputs:` paths after file moves | [D: Task Definition & Contract](definition-contract.md) | D.1 |
| Stale `inputs:` blocking ready nodes | [D: Task Definition & Contract](definition-contract.md) | D.2 |
| Missing spawner template directory | [D: Task Definition & Contract](definition-contract.md) | D.3 |
| Cycle detected in DAG | [D: Task Definition & Contract](definition-contract.md) | D.4 |
| Malformed TASK.md frontmatter | [D: Task Definition & Contract](definition-contract.md) | D.5 |
| Pre-existing typecheck/build errors | [R: Runtime Execution](runtime-execution.md) | R.1 |
| Browser/server E2E in AI spawn | [R: Runtime Execution](runtime-execution.md) | R.2 |
| Mixed-shape task (creation + cleanup) | [R: Runtime Execution](runtime-execution.md) | R.3 |
| Frontier unresolved (spawner no children) | [R: Runtime Execution](runtime-execution.md) | R.4 |
| Fingerprint mismatch cascade | [R: Runtime Execution](runtime-execution.md) | R.5 |
| State out of sync / manual recovery | [S: State Recovery](state-recovery.md) | S.1 |
| Orphaned spawned tasks | [S: State Recovery](state-recovery.md) | Scenario E |
| Task marked done but outputs missing | [S: State Recovery](state-recovery.md) | Scenario B |
| Spawn failed, need to re-run spawner | [S: State Recovery](state-recovery.md) | Scenario A |
| Step through screens one-by-one | [S: State Recovery](state-recovery.md) | Scenario D |
| Nuclear reset needed | [S: State Recovery](state-recovery.md) | Scenario F |

## Troubleshooting Groups

### [E: Environment & Configuration](env-config.md)
Pre-flight checks that run **before** task execution starts. Problems here cause the first task to fail immediately.

- E.1: Foreign playbook hijacks `converge run`
- E.2: Secondary playbook fails after main one finishes
- E.3: HTTP 401 / Invalid API key on the first task
- E.4: Missing or malformed project.yaml

### [D: Task Definition & Contract](definition-contract.md)
Issues where the playbook's **source definition** is broken — TASK.md frontmatter, template structure, dependency graphs. These fail at compile time or DAG build, before any task body runs.

- D.1: Stale `outputs:` paths after workflow moved files
- D.2: Stale `inputs:` blocking a node that should be ready
- D.3: Missing spawner template directory
- D.4: Cycle detected in DAG
- D.5: Malformed TASK.md frontmatter

### [R: Runtime Execution](runtime-execution.md)
Problems that occur during task execution — after the DAG is built and tasks start running. These fail at runtime, not compile time.

- R.1: Pre-existing typecheck/build errors block task completion
- R.2: Verification task expects browser/server E2E inside an AI spawn
- R.3: Mixed-shape task: file-creation + tree-wide cleanup in one task
- R.4: Frontier unresolved — spawner produced no children
- R.5: Fingerprint mismatch cascade — all downstream re-executes

### [S: State Recovery & Manual Correction](state-recovery.md)
When playbook state is out of sync with reality — orphaned tasks, stale statuses, missing spawned children, or ledger/DAG divergence.

- S.1: Playbook state out of sync — manual recovery workflow
- Available tools for manual recovery (table)
- AI babysitter scenarios A-G:
  - A: Spawn failed — re-run just the spawner
  - B: Task marked `done` unexpectedly — undo and rerun
  - C: Rerun a specific failed task
  - D: Step through screens one-by-one
  - E: Bulk fix — many screens stuck or orphaned
  - F: Nuclear option — wipe playbook, start fresh (keep outputs)
  - G: Manual respawn for a missed screen

## Diagnostic Flow

When babysitting a Converge run, follow this order:

1. **Environment** — Check shell env vars vs project.yaml provider config ([E: Environment & Configuration](env-config.md))
2. **Definition** — Validate TASK.md frontmatter, check for cycles ([D: Task Definition & Contract](definition-contract.md))
3. **Execution** — Monitor runtime failures, check logs ([R: Runtime Execution](runtime-execution.md))
4. **State** — If DAG/ledger diverge, use manual recovery tools ([S: State Recovery](state-recovery.md))

## When None of These Match

If your symptom isn't covered in any group:

1. **Read the node forensics:**
   ```bash
   ls .converge/journal/<playbook>/tasks/<nodeId>/
   cat .converge/journal/<playbook>/tasks/<nodeId>/FEEDBACK.md
   cat .converge/journal/<playbook>/tasks/<nodeId>/LEARN.md
   ```
2. **Check the event stream** around the failure:
   ```bash
   grep "NODE_FAIL\|CHECK_FAIL\|ERROR" .converge/journal/<playbook>/events.jsonl | tail -20
   ```
3. **Surface to the user** with: failing node ID, exact event lines, what you've tried, your hypothesis, and a proposed fix.
4. Wait for approval before applying any patch.

## Core Principles

- **Use CLI tools, never hand-edit state files** — `converge tasks mark`, `converge clean`, `converge reset`
- **Surgical over nuclear** — `clean --select` before `reset`
- **Verify before acting** — `converge run --dry` before `converge run`
- **Outputs are truth** — check disk before marking tasks done
- **Log manual interventions** — use `--reasoning` for audit trail
