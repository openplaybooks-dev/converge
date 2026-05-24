# Runtime Execution Issues

Problems that occur during task execution — after the DAG is built and tasks start running. These fail at runtime, not compile time.

## R.1 Pre-existing typecheck/build errors block task completion

**Symptom:**
```
CHECK_FAIL <nodeId> typecheck
  pnpm typecheck exited 1
  Found 47 errors in 12 files
```
A task's check runs `pnpm typecheck` and fails because the codebase has pre-existing type errors unrelated to the task's work.

**Root cause:** The check is too broad — it validates the entire codebase instead of just the task's outputs. Pre-existing errors in unrelated files cause the check to fail even when the task's own work is correct.

**Fix recipe:**

1. **Narrow the check** to only validate the task's outputs:
   ```yaml
   checks:
     - id: typecheck
       cmd: "pnpm tsc --noEmit src/components/Button.tsx"
   ```

2. **Or split into two checks** — one for the task's outputs, one for global health:
   ```yaml
   checks:
     - id: output-exists
       cmd: "test -f src/components/Button.tsx"
     - id: output-typechecks
       cmd: "pnpm tsc --noEmit src/components/Button.tsx"
   ```

3. **If the pre-existing errors must be fixed first**, delete the offending files and clean imports:
   ```bash
   rm <offending-file>
   # Clean imports referencing the deleted file
   pnpm typecheck 2>&1 | grep -c "error TS"
   ```
   Repeat until count is 0.

4. **Re-run** — previously blocked nodes will pass.

**Verification:** `pnpm typecheck` exits 0. Next run shows `CHECK_PASS` for the typecheck check.

---

## R.2 Verification task expects browser/server E2E inside an AI spawn

**Symptom:** A task says "spin up `pnpm dev`, curl `localhost:N`, exercise pages, write a JSON report." The AI tries — runs `pnpm dev &`, curls, sometimes runs aggressive cleanups like `pkill -f "node"` (which can kill the runner itself). Times out or deadlocks.

**Root cause:** AI spawns are designed for file edits + short shell commands, not multi-process choreography. No port management, no headless browser, no reliable long-lived server lifecycle.

**Fix recipe — restructure the task:**

1. **Drop the `allPassed === true` gate.** Replace with a "report file exists + has expected schema" check:
   ```yaml
   checks:
     - id: report-written
       cmd: "test -f e2e-verify.json && node -e \"const r=JSON.parse(require('fs').readFileSync('e2e-verify.json','utf8'));process.exit(Array.isArray(r.scenarios)&&r.scenarios.length>0?0:1)\""
   ```

2. **Reframe the task body** as "scaffold the report file, leave verdicts for human review."

3. **If you genuinely need automated E2E**, split into two tasks:
   - Task A: spawn `pnpm dev`, write pid/port file, exit.
   - Task B (depends on A): read pid/port, hit endpoints, kill pid, write report.

**Verification:** Task passes its relaxed gate cleanly. No `pkill -f "node"` in any task body.

---

## R.3 Mixed-shape task: file-creation + tree-wide cleanup in one task

**Symptom:** A single node takes many attempts to converge. The check list contains both "new file X exists" (`test -f some/path.ts`) AND "no occurrences of pattern Y in src/" (`grep -r 'badPattern' src`). Each attempt scrubs a few files but new ones keep being found.

**Root cause:** Existence and negation checks converge at different rates. Existence flips false→true once when the file is written. Negation drains chunk-by-chunk over many edits.

**Fix recipe — split into creator + cleanup, two sibling nodes:**

```yaml
# Before (one node, slow):
- id: 009-converge-event-stream
  outputs:
    - src/app/api/events/route.ts
  checks:
    - id: route-exists
      cmd: "test -f src/app/api/events/route.ts"
    - id: no-legacy-websocket
      cmd: "test -z \"$(grep -rl 'useWebSocket' src 2>/dev/null)\""

# After (two nodes, fast):
- id: 009-converge-event-stream
  outputs:
    - src/app/api/events/route.ts
  checks:
    - id: route-exists
      cmd: "test -f src/app/api/events/route.ts"

- id: 009b-purge-legacy-websocket
  depends_on: [009-converge-event-stream]
  checks:
    - id: no-legacy-websocket
      cmd: "test -z \"$(grep -rl 'useWebSocket' src 2>/dev/null)\""
```

**Verification:** Each single-shape node converges in 1-2 attempts. No multi-attempt thrashing.

---

## R.4 Frontier unresolved — spawner produced no children

**Symptom:**
```
FRONTIER_UNRESOLVED <nodeId>
```
A `mode: spawner` (or `mode: converger`) parent was expected to spawn children, but the DAG shows zero child nodes. The corresponding `$CONVERGE_TASK_DIR/mode-violation.json` typically reports one of: `spawner-missing-manifest`, `spawner-empty-manifest`, `spawner-row-count`, or `spawner-apply-failed`.

**Root cause:** Either (a) the body ran no `converge spawn` CLI calls (and no legacy `spawn.plan.jsonl`), (b) the body ran zero invocations but `spawn.min_children: 1` (or higher) is declared, (c) every invocation failed during preview (template-not-found, missing-required-param, unknown-param, param-type-mismatch — see `STATUS.md` for the per-child `fix:` blocks), or (d) the input catalog the body reads is empty/missing.

**Fix recipe:**

1. Inspect the violation:
   ```bash
   cat "$CONVERGE_TASK_DIR/mode-violation.json"
   ls "$CONVERGE_SPAWN_DIR"/ 2>/dev/null || echo '(no spawn dir)'
   cat "$CONVERGE_SPAWN_DIR/STATUS.md" 2>/dev/null || echo '(no STATUS.md — body wrote nothing under spawn/)'
   # Legacy fallback for unmigrated playbooks:
   cat "$CONVERGE_TASK_DIR/spawn.plan.jsonl" 2>/dev/null || echo '(no legacy manifest)'
   cat "$CONVERGE_TASK_DIR/spawn.plan.result.jsonl" 2>/dev/null || echo '(no legacy apply result)'
   ```
2. Check whatever the body reads (catalog file, API response, etc.):
   ```bash
   cat <catalog-path> | jq 'length'   # or equivalent
   ```
3. Run the body's command manually (`bash -x <body>`) to see why no invocations are produced.
4. Fix the input or the body. The framework will re-apply on the next run; a re-run with byte-identical params is a no-op.

**Verification:** `mode-violation.json` is absent. `STATUS.md` shows `- [x]` for every row (or `spawn.plan.result.jsonl` shows `ok: true` per row for legacy bodies). `SEED_SPAWN` events appear during run showing the expected child count.

---

## R.5 Fingerprint mismatch cascade — all downstream re-executes

**Symptom:** An incremental run (`--select 'state:modified+'`) re-executes far more nodes than expected. Nodes that shouldn't have changed show `NODE_COMPLETE fresh` instead of `cached`.

**Root cause:** A node's fingerprint changed unexpectedly — often because a TASK.md was touched (even whitespace), a `vars:` value changed, or the manifest hash differs due to a re-compile that produced a different DAG structure.

**Fix recipe:**

1. Check what actually changed:
   ```bash
   diff <(jq -S . .converge/journal/<playbook>/manifest.prev.json) <(jq -S . .converge/journal/<playbook>/manifest.json)
   ```
2. If the diff is noise (whitespace, key ordering), the fingerprint computation is too broad. This is a framework issue — surface to the user.
3. If the diff is real (a `depends_on` edge changed, a `vars:` value updated), the cascade is correct behavior. Let it run.

**Verification:** After a clean run, the next `--select 'state:modified+'` should show all `cached` (zero `fresh`).

---

## When none of these match

If your symptom isn't covered above:

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
