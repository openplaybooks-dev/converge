# Converge run output — event catalog

Every distinct event that appears in the `events.jsonl` stream, what it means, what to do.

Use this when:

- Composing the Monitor `grep -E` filter
- Classifying an event during a run
- Debugging "what was happening when the run stopped?"

## How to read this file

Each entry is:

```
  <event token (from events.jsonl)>
  <one-line meaning>
  → <action>
```

Events are newline-delimited JSON objects in `.converge/journal/<playbook>/events.jsonl`. Each object has a `type` field.

## Recommended Monitor filter

```bash
tail -f .converge/journal/<playbook>/events.jsonl | grep -E '(NODE_START|NODE_COMPLETE|NODE_FAIL|CHECK_FAIL|DAG_LAYER|CYCLE|ERROR)'
```

This catches all structural signals. Drop `NODE_START` and `DAG_LAYER` for a quieter feed:

```bash
tail -f .converge/journal/<playbook>/events.jsonl | grep -E '(NODE_COMPLETE|NODE_FAIL|CHECK_FAIL|CYCLE|ERROR)'
```

---

## Progress signals — keep watching

```
NODE_START <nodeId>
```
A node began execution. Forward progress.
→ continue.

```
NODE_COMPLETE <nodeId> cached
```
Node's fingerprint matched the previous runstate. Skipped execution — outputs from the prior run are reused.
→ continue. This is the common case for incremental runs.

```
NODE_COMPLETE <nodeId> fresh
```
Node executed and all checks passed. Outputs written and verified.
→ continue.

```
DAG_LAYER 3/7
```
Executing topological layer 3 of 7. Nodes within a layer are independent and may run in parallel.
→ continue. Progress signal.

```
CHECK_PASS <nodeId> <checkId>
```
A single check passed. Useful when watching a specific node's checks.
→ continue.

---

## Node lifecycle — normal

```
SEED_SPAWN <parentId> → [<childId>, ...]
```
A parent with `spawn:` config (or `converge:` config) spawned children successfully — RFC 0024 `<id>/spawn.yml` invocations (or, for legacy bodies, a `spawn.plan.jsonl` manifest) were expanded against templates and the resulting child rows were registered in the runtime ledger.
→ continue. New nodes will appear in subsequent DAG_LAYER events.

```
ATTEMPT <nodeId> 2/3
```
Second attempt on this node. The AI agent read FEEDBACK.md and LEARN.md from attempt 1 and is retrying.
→ continue unless attempt 3 arrives with the same failures.

---

## Structural failures — diagnose now

```
CHECK_FAIL <nodeId> <checkId>
```
A check failed on this attempt. The node may still converge on retry.
→ if followed by NODE_COMPLETE on retry, it self-recovered. If repeated across all attempts for the same node, diagnose.

```
NODE_FAIL <nodeId> <reason>
```
Node failed all attempts. The runner will not retry. Downstream nodes are blocked.
→ stop. Read `.converge/journal/<playbook>/tasks/<nodeId>/FEEDBACK.md` and `LEARN.md`. Apply a fix from `troubleshooting/playbook.md` or surface to the user.

```
CYCLE_DETECTED [id1 → id2 → id3 → id1]
```
A dependency cycle was found during compilation. The DAG is invalid.
→ trace the `depends_on` edges between the listed nodes. Remove the edge that creates the cycle. Re-compile.

```
FRONTIER_UNRESOLVED <nodeId>
```
A parent with `spawn:` config was expected to spawn children but produced no children. Either the body wrote no `<id>/spawn.yml` invocations (and no legacy `spawn.plan.jsonl`), or every invocation was rejected during preview (see `$CONVERGE_SPAWN_DIR/STATUS.md` for per-child failure rows with `fix:` blocks), or the body crashed before writing any invocation file.
→ inspect `$CONVERGE_SPAWN_DIR/STATUS.md` (RFC 0024 transparency surface), `$CONVERGE_TASK_DIR/mode-violation.json` (contract violation code — e.g. `spawner-missing-manifest`, `spawner-empty-manifest`, `spawner-apply-failed`), and — for unmigrated playbooks — `$CONVERGE_TASK_DIR/spawn.plan.{jsonl,result.jsonl}`. Fix the body or the offending `spawn.yml` files; re-run.

```
INPUT_MISSING <nodeId> <path>
```
A node's declared `inputs:` file doesn't exist on disk. The upstream producer may have failed or the path is wrong.
→ check whether the upstream node completed successfully. If the path is stale, fix the TASK.md `inputs:` and re-compile.

---

## Transients — runner handles, do nothing

```
ERROR <provider>: API Error: 529 Overloaded
ERROR <provider>: network timeout
```
Provider overload or transient network issue. Runner retries automatically.
→ continue. Don't kill the run.

## Run-level events

```
RUN_START <playbook> <manifestHash>
```
Run began. The manifest hash identifies which compiled DAG is being executed.
→ continue.

```
RUN_COMPLETE <playbook>
```
All nodes completed. Run succeeded.
→ verify final state with `converge list --playbook=<name>`.

```
RUN_CANCELLED <playbook>
```
Run was interrupted (SIGTERM, process kill). `runstate.json` was saved — resuming is automatic.
→ re-launch with the same command. Completed nodes are cached.

---

## Quick action lookup

| You see... | You do... |
|---|---|
| `NODE_COMPLETE cached` | Nothing — it's a cache hit |
| `NODE_FAIL <id>` | Read FEEDBACK.md / LEARN.md, diagnose |
| `CYCLE_DETECTED` | Fix `depends_on` edges, re-compile |
| `FRONTIER_UNRESOLVED` | Read `STATUS.md` in `$CONVERGE_SPAWN_DIR` and `mode-violation.json` in `$CONVERGE_TASK_DIR`; fix the offending `<id>/spawn.yml` or the body |
| `INPUT_MISSING` | Check upstream node status, fix path |
| `CHECK_FAIL` once then `NODE_COMPLETE` on retry | Self-recovered — continue |
| `CHECK_FAIL` repeating across all attempts | Diagnose — load `troubleshooting/playbook.md` |
| `ERROR <provider>: API Error: 529` | Nothing — runner retries |
| Run process exits 0 | Verify with `converge list` |
| Run process exits non-zero | Tail last 30 events, find the NODE_FAIL |
