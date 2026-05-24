# State Recovery & Manual Correction

When playbook state is out of sync with reality — orphaned tasks, stale statuses, missing spawned children, or ledger/DAG divergence. These are **state synchronization** problems, not playbook definition problems.

## S.1 Playbook state out of sync — manual recovery workflow

**Symptom:**

`converge list` shows 0 or far fewer tasks than expected. `converge inspect` shows 0 completed despite prior runs. The DAG is missing spawned children. `tasks.jsonl` has rows with `source=spawned` but `parent=null` or missing `taskRef`. Spawned tasks exist in inventory but never appear in the DAG. Orphaned `doing` tasks from crashed runs. A task was marked `done` but its outputs are missing.

This happens after:
- Framework migration between RFCs (e.g., RFC 0024 → RFC 0031 unified tasks.jsonl / `converge spawn` CLI)
- Interrupted runs where the ingest pipeline didn't complete
- Manual edits to `tasks.jsonl` or journal files
- Orphaned spawned children whose parent task was cleaned
- AI agents crashing mid-execution leaving stale `doing` statuses
- A spawner body that called `converge spawn` but the ingest pipeline never completed

**Root cause:**

The runtime ledger (`tasks.jsonl`) and the DAG builder have diverged. The ledger knows about tasks the DAG cannot discover, or tasks have stale statuses (`doing` with no activity). This is a **state synchronization** problem, not a playbook definition problem.

**Core principle:** The existing CLI toolset is sufficient for manual correction. Use the tools — don't hand-edit files.

---

## Available tools for manual recovery

| Tool | What it does | When to use |
|------|-------------|-------------|
| `converge tasks mark <id> --status X` | Set a task's status in the ledger | Task is stuck, wrongly marked done, needs redo |
| `converge tasks list --source spawned` | List all spawned task rows | Audit what the spawner created |
| `converge clean --select=X --yes` | Delete journal subtree + reset state | Wipe a broken task's execution state |
| `converge reset <name> --yes` | Delete entire playbook journal | Nuclear reset for one playbook |
| `converge run --select=X` | Run specific task(s) only | Rerun one task, step through screens |
| `converge run --resume` | Continue from last state | Resume after fixing state |
| `converge run --dry` | Preview what would execute | Verify before committing to a run |
| `converge spawn <id> <template>` | Manually add a task row | Respawn a specific screen that was missed |
| `converge list --playbook=X` | Show DAG nodes | Verify what the framework sees |
| `converge inspect --task=X` | Show task detail + journal | Debug why a task failed or is stuck |
| `converge why --task=X` | Explain blocked/pending status | Understand dependency chains |

---

## AI babysitter scenarios

When babysitting a playbook, these are the common patterns and how to handle each:

### Scenario A: Spawn failed — re-run just the spawner

```bash
# Clean the spawner task's journal state
converge clean --select=02-spawn --yes --playbook=<name>

# Run only the spawner
converge run --playbook=<name> --select=02-spawn

# Verify children were created
converge tasks list --playbook=<name> --source spawned | jq 'length'
```

If the spawn body itself is broken (e.g., old RFC 0024 syntax vs RFC 0031 framework), fix the body script first, then re-run.

### Scenario B: Task marked `done` unexpectedly — undo and rerun

```bash
# Mark it back to todo
converge tasks mark <task-id> --status todo --playbook=<name>

# Clean its journal so it re-executes
converge clean --select=<task-id> --yes --playbook=<name>

# Run just this task
converge run --playbook=<name> --select=<task-id>
```

### Scenario C: Rerun a specific failed task

```bash
# Check why it failed
converge inspect --task=<task-id> --playbook=<name>

# Clean and rerun
converge clean --select=<task-id> --yes --playbook=<name>
converge run --playbook=<name> --select=<task-id>
```

### Scenario D: Step through screens one-by-one

```bash
# Pick one screen, run all its 7 steps
converge run --playbook=<name> --select="screen-chat-*"

# Verify outputs on disk
ls apps/portal/src/routes/\$workspace/chat/

# Move to next screen
converge run --playbook=<name> --select="screen-bots-list-*"
```

### Scenario E: Bulk fix — many screens stuck or orphaned

```bash
# Drop all orphaned spawned tasks (no parent in DAG)
for id in $(converge tasks list --playbook=<name> --source spawned | jq -r '.[] | select(.parent == null) | .id'); do
  converge tasks mark "$id" --status dropped --playbook=<name>
done

# Reset all stuck "doing" tasks to "todo"
for id in $(converge tasks list --playbook=<name> | jq -r '.[] | select(.status == "doing") | .id'); do
  converge tasks mark "$id" --status todo --playbook=<name>
done

# Clean the spawner, re-spawn, re-run
converge clean --select=02-spawn --yes --playbook=<name>
converge run --playbook=<name> --select=02-spawn
converge run --playbook=<name>
```

### Scenario F: Nuclear option — wipe playbook, start fresh (keep outputs)

```bash
# This deletes journal state but NOT your source files
converge reset <name> --yes

# Also clear stale inventory ledger (legacy format rows without taskRef)
rm .converge/inventory/<name>/tasks.jsonl

# Re-run from scratch (cached tasks will skip if outputs exist)
converge run --playbook=<name>
```

**What happens after reset + inventory clear:**
- The DAG rebuilds from `tasks/` folder auto-discovery (RFC 0032)
- All nodes are discovered with proper task definitions
- Pre-flight checks skip tasks whose outputs already exist on disk
- Tasks needing real work (spawner, screen generation) execute fresh
- **Result:** Clean run with proper caching

### Scenario G: Manual respawn for a missed screen

```bash
# Use converge spawn to add a task row directly
converge spawn screen-landing-03-react screen-03-react \
  --var screenId=landing --var route=/ --var title=Landing \
  --after screen-landing-02-design \
  --playbook=<name>
```

### Scenario H: Inventory/Journal state mismatch — systematic reconciliation

**Symptom:**

`converge run` blocks with "existing run state found" but `runstate.json` has 0 DAG nodes (zombie runstate). Inventory `tasks.jsonl` has stale entries (tasks marked `done` but outputs missing on disk). Outputs exist on disk (`.stitch/UX.md`, `.stitch/SITE.md`) but tasks aren't marked cached. The operator had to manually `rm` journal files to unblock.

**Root cause:**

Runtime state (journal + inventory + runstate) diverged from reality (source TASK.md files + actual outputs on disk). This happens after:
- Interrupted runs where the spawner wrote outputs but journal wasn't updated
- Framework migrations that changed state schema
- Manual cleanup that removed journal but left inventory intact
- Crashed runs leaving zombie runstate (status "running" with 0 active nodes)

**Solution: `converge reconcile`**

A systematic state-repair command (like `git rebase`) that reconciles chunk-by-chunk:

```bash
# Step 1: Reconcile state — clean zombie runstate, reconcile inventory, rebuild DAG, pre-flight outputs
converge reconcile --playbook=<name>

# Output shows:
#   ✓ Cleaned stale runstate (zombie detected)
#   ✓ Removed N stale inventory entries
#   ✓ DAG rebuilt: M nodes discovered
#   ✓ Pre-flight: X cached, Y pending

# Step 2: Continue from reconciled state
converge run --resume --playbook=<name>
```

**What `reconcile` does (4 phases):**

1. **Clean zombie runstate** — if `runstate.json` has 0 active nodes or status "running" with all nodes terminal, delete it
2. **Reconcile inventory** — for each `tasks.jsonl` entry with declared outputs, verify they exist on disk; remove stale entries
3. **Rebuild DAG** — discover all tasks from source playbook (`tasks/` directory tree)
4. **Pre-flight** — for each task, check if declared `outputs:` exist on disk; mark as cached (will be skipped by `run --resume`)

**When to use:**

- `converge run` blocks with "existing run state found" and you know the playbook changed
- `converge doctor` reports zombie runstate (0 DAG nodes, status "running")
- Outputs exist on disk but tasks aren't marked cached
- Inventory has stale entries that don't match disk reality

**Verification:**

```bash
# Before reconcile
converge doctor --playbook=<name>
# Should show: zombie runstate, stale inventory

# After reconcile
converge run --playbook=<name> --dry
# Should show: correct DAG node count, cached tasks skipped
```

---

## Layered approach

1. **Audit first** — `converge run --playbook=<name> --dry` vs `converge tasks list` — find the gap
2. **Surgical repair** — use `clean --select` or `tasks mark` on specific tasks
3. **Step-through** — use `run --select` to execute incrementally
4. **Verify** — `converge run --playbook=<name> --dry` before full run, check outputs on disk
5. **Nuclear last** — `converge reset` only when surgical repair fails

**Note:** `converge list --playbook=<name>` has a known issue where it passes the project root instead of the playbook dir to the DAG builder. Use `converge run --playbook=<name> --dry` to see the full DAG instead.

---

## Verification

- `converge run --playbook=<name> --dry` shows the expected number of DAG nodes (not 0)
- Spawned tasks have non-null `parent` in the ledger
- All tasks have valid `taskRef` (either `{kind:"static"}` or `{kind:"template"}`)

---

## When to escalate

If `converge reset <name> --yes` + `converge run --playbook=<name>` still produces 0 DAG nodes, the issue is in the playbook definition (missing `tasks/` dirs, malformed `TASK.md` frontmatter, broken `depends_on` cycles). Hand off to `converge-planning`.

---

## Hard rules for manual recovery

- **NEVER** hand-edit `tasks.jsonl` or `runstate.json` — use CLI commands
- **ALWAYS** `converge run --dry` before `converge run` to preview
- **PREFER** `converge clean --select` over `converge reset` (surgical > nuclear)
- **VERIFY** outputs exist on disk before marking tasks `done` manually
- **LOG** every manual `tasks mark` with a `--reasoning` for audit trail
- **IF** a spawned task row has `taskPath` pointing to a journal `EXPANDED.md` that doesn't exist on disk → the spawn never completed; drop and respawn
