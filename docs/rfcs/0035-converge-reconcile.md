# RFC 0035: `converge reconcile` — Systematic State Recovery Command

| Field | Value |
|---|---|
| **Status** | proposed |
| **Author** | claude |
| **Date** | 2026-05-22 |
| **Related** | troubleshooting/state-recovery.md S.1, SKILL.md converge-control |

## Problem

When a playbook's runtime state diverges from reality — zombie runstate (0 DAG nodes, status "running"), stale inventory entries, outputs on disk but tasks not marked cached — operators must manually `rm` files or resort to `converge reset` (nuclear) / hand-editing `tasks.jsonl`. There's no systematic CLI command to reconcile state.

The current `converge clean` only deletes journal subtrees. It doesn't:
- Clean zombie runstate metadata
- Reconcile stale inventory entries
- Rebuild the DAG and pre-flight outputs
- Report what's cached vs pending after reconciliation

## Design

### New command: `converge reconcile`

```
converge reconcile --playbook=<name>
```

A standalone command (not a flag on `run`) because reconcile is a **state-repair** operation, not an **execution** mode. It follows the existing pattern of `clean`, `reset`, `doctor` — all separate commands that operate on playbook state.

### What it does (4 phases)

#### Phase 1: Audit runstate
- Read `.converge/journal/<name>/runstate.json`
- If runstate is a zombie (status "running" but 0 DAG nodes, or all nodes terminal with no active work) → delete it
- If runstate is healthy → leave it alone

#### Phase 2: Reconcile inventory
- Read `.converge/inventory/<name>/tasks.jsonl`
- For each entry with declared outputs, verify they exist on disk
- Remove entries whose outputs are missing (stale)
- Remove malformed entries

#### Phase 3: Rebuild DAG + pre-flight
- Discover all tasks from source playbook (`tasks/` directory tree)
- For each task, check if declared `outputs:` exist on disk
- Mark tasks with all outputs present as "cached" (will be skipped by `run --resume`)
- Tasks with missing outputs remain "pending"

#### Phase 4: Report
- Summary: cleaned runstate (yes/no), stale inventory entries removed (N), DAG nodes (N), cached (N), pending (N)
- Next ready-to-run task (first pending after all cached deps)
- Instruction: `converge run --resume --playbook=<name>`

### CLI surface

```bash
# Full reconcile (audit + repair + pre-flight + report)
converge reconcile --playbook=mezon-portal

# With verbose output (show each action taken)
converge reconcile --playbook=mezon-portal --verbose

# JSON output (for scripts/babysitters)
converge reconcile --playbook=mezon-portal --json
```

### Integration with existing workflow

The `converge run` precheck (`run-precheck.ts`) should detect a zombie runstate and suggest reconcile:

```
❌ Existing run state found at .converge/journal/mezon-portal/runstate.json
   Runstate appears stale (0 active DAG nodes).

   Suggested fix:
      converge reconcile --playbook=mezon-portal   # repair state
      converge run --resume --playbook=mezon-portal # continue from here
```

### Files to change

| File | Change |
|---|---|
| `packages/cli/src/commands-reconcile.ts` | **new** — reconcile command implementation |
| `packages/cli/src/main.ts` | Wire `converge reconcile` as new subcommand |
| `packages/cli/src/run-precheck.ts` | Detect zombie runstate, suggest `reconcile` |
| `.claude/skills/converge-control/troubleshooting/state-recovery.md` | Add reconcile recipe |
| `.claude/skills/converge-control/SKILL.md` | Add `converge reconcile` to preferred command set |

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | Written |
| `commands-reconcile.ts` | **done** | Full implementation (4 phases: runstate, inventory, DAG, pre-flight) |
| Wire into `main.ts` | **done** | Subcommand handler added, help text, positional commands set |
| Enhance `run-precheck.ts` | **done** | Zombie detection in non-TTY path, reconcile suggestion |
| Update troubleshooting docs | **done** | Scenario H in `troubleshooting/state-recovery.md` |
| Update converge-control skill | **done** | `converge reconcile` in preferred commands, workflow, hard rules |
| `pnpm build` | **done** | TypeScript clean, tsup entry points configured |
| `pnpm test` | **done** | No regressions |
