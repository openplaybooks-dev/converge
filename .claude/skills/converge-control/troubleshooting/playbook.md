# Converge troubleshooting playbook

Symptom-indexed fixes for the run-blockers we know how to solve. Each entry is **symptom → root cause → fix recipe → verification**.

If your symptom isn't in this file, **STOP** and surface to the user with: failing node ID, exact event lines, the check that failed, what you've tried, and a proposed fix. Don't improvise patches on novel symptoms.

## Quick index

1. [Previous run cancelled — node status unclear](#1-previous-run-cancelled--node-status-unclear)
2. [Stale `outputs:` paths after workflow moved files](#2-stale-outputs-paths-after-workflow-moved-files)
3. [Stale `inputs:` blocking a node that should be ready](#3-stale-inputs-blocking-a-node-that-should-be-ready)
4. [Missing seed sub-template directory](#4-missing-seed-sub-template-directory)
5. [Foreign playbook hijacks `converge run`](#5-foreign-playbook-hijacks-converge-run)
6. [Secondary playbook fails after main one finishes](#6-secondary-playbook-fails-after-main-one-finishes)
7. [Pre-existing typecheck/build errors in vendored code](#7-pre-existing-typecheckbuild-errors-in-vendored-code)
8. [Verification task expects browser/server E2E inside an AI spawn](#8-verification-task-expects-browserserver-e2e-inside-an-ai-spawn)
9. [Mixed-shape task: file-creation + tree-wide cleanup in one task](#9-mixed-shape-task-file-creation--tree-wide-cleanup-in-one-task)
10. [Cycle detected in DAG](#10-cycle-detected-in-dag)
11. [Frontier unresolved — seed spawned no children](#11-frontier-unresolved--seed-spawned-no-children)
12. [Fingerprint mismatch cascade — all downstream re-executes](#12-fingerprint-mismatch-cascade--all-downstream-re-executes)

---

## 1. Previous run cancelled — node status unclear

**Symptom:**
```
RUN_CANCELLED <playbook>
```
Or the run process was killed and you're unsure what completed.

**Root cause:** The previous run was interrupted (SIGTERM, crash, reboot) without completing all nodes.

**Fix:** Re-run. The runner reads `runstate.json` — completed nodes carry forward, incomplete nodes execute fresh. No special flags needed.

```bash
converge run <playbook.yml>
```

To explicitly retry only nodes that failed (not were cancelled):

```bash
converge run <playbook.yml> --select 'result:error+'
```

Do **not** use `--full-refresh` — it ignores the previous runstate and re-executes everything.

**Verification:** Run proceeds without re-executing completed nodes. `NODE_COMPLETE cached` events for previously-done work.

---

## 2. Stale `outputs:` paths after workflow moved files

**Symptom:**
```
CHECK_FAIL <nodeId> <checkId>
  Task output not created: <path>
```
The path in the error points to a location that's empty on disk, but the file actually exists at a different location. Common: a `split` task declares output at `lib/screens/X/widgets/foo.dart`, a follow-up `lift` task moves it to `lib/widgets/foo.dart`, and the split task's check fails on re-validation because the file moved.

**Root cause:** TASK.md frontmatter declares an `outputs:` path that's correct at generation time but stale after later steps move the file.

**Fix recipe:**

1. **Fix the template** so future spawns handle the moved file:
   ```yaml
   # In the template TASK.md — make checks tolerate the moved location:
   checks:
     - id: widget-exists
       cmd: "bash -c 'test -f {{widgetPath}} || test -f lib/widgets/$(basename {{widgetPath}})'"
   ```
   Or drop the brittle `outputs:` entry entirely if the check is sufficient.

2. **Regenerate already-spawned nodes.** For each affected spawned node directory under `target/{playbook}/tasks/`, re-render from the fixed template with the node's existing `vars:`.

3. **Re-compile and re-run:**
   ```bash
   converge compile <playbook.yml>
   converge run <playbook.yml> --select 'result:error+'
   ```

**Verification:** `CHECK_FAIL` doesn't recur for the fixed node. Node completes on next attempt.

---

## 3. Stale `inputs:` blocking a node that should be ready

**Symptom:**
```
INPUT_MISSING <nodeId> <path>
```
A node can't start because its declared `inputs:` file doesn't exist. The file was produced but later moved by a downstream task.

**Root cause:** The `inputs:` path references a file that existed when the DAG was compiled but was moved or renamed.

**Fix recipe:**

1. **Fix the TASK.md** — drop the brittle input or make it conditional:
   ```yaml
   # Instead of:
   inputs:
     - "{{localWidgetPath}}"
   # Use a check that tolerates the moved location.
   ```

2. **Regenerate affected spawned nodes** from the fixed template.

3. **Re-compile and re-run:**
   ```bash
   converge compile <playbook.yml>
   converge run <playbook.yml> --select 'result:error+'
   ```

**Verification:** Node moves past the input gate. `INPUT_MISSING` doesn't recur.

---

## 4. Missing seed sub-template directory

**Symptom:**
```
NODE_FAIL <seedParentId> seed script import failed: <path>/seed.js
```
The seed.js exists and parses, but its `run()` references a sub-template (e.g. `tasks/subtask/TASK.md`) that's not on disk.

**Root cause:** When migrating a playbook, sub-template directories were missed in the copy.

**Fix recipe:**

1. Find a known-good source that has the sub-template:
   ```bash
   find <source-playbook>/seeds/ -type d -name "subtask"
   ```

2. Copy into the target playbook:
   ```bash
   cp -r <source>/seeds/<name>/tasks/<step>/tasks/subtask \
         <target-playbook>/seeds/<name>/tasks/<step>/tasks/subtask
   ```

3. Re-compile and re-run:
   ```bash
   converge compile <playbook.yml>
   converge run <playbook.yml> --select 'result:error+'
   ```

**Verification:** Seed spawns children successfully. `SEED_SPAWN` event appears in the stream.

---

## 5. Foreign playbook hijacks `converge run`

**Symptom:** Run completes the intended playbook, then starts running tasks from a different playbook. The other playbook fails because it expects setup that hasn't happened.

**Root cause:** `.converge/playbooks/` contains more than one playbook. A bare `converge run` may pick a different one than intended.

**Fix:** Use the explicit playbook path on every command:

```bash
converge run .converge/playbooks/default/playbook.yml
converge list .converge/playbooks/default/playbook.yml
```

If the other playbook is genuinely unwanted, remove it (after confirming with the user):

```bash
rm -rf .converge/playbooks/<unwanted>
```

**Verification:** `converge run` only starts nodes from the intended playbook.

---

## 6. Secondary playbook fails after main one finishes

**Symptom:** The primary playbook completes, then a secondary playbook starts and fails immediately on setup issues.

**Root cause:** Same as #5 — multiple playbooks present, auto-discovery picks the wrong one.

**Fix:** Same as #5 — use the explicit playbook path.

**Verification:** Primary playbook completes cleanly. No secondary playbook nodes appear.

---

## 7. Pre-existing typecheck/build errors in vendored code

**Symptom:** A `typecheck` or `build` check fails identically across many nodes. The failing file isn't something the AI wrote — it was already in the repo before the run started.

**Root cause:** The playbook's typecheck check is all-or-nothing. Any pre-existing error fails every node with that check.

**Fix recipe:**

1. **Identify the offending files:**
   ```bash
   pnpm typecheck 2>&1 | grep "error TS" | head -20
   ```

2. **Decide:** are these files the playbook needs? If yes, fix the types. If no (vestigial vendored code), delete them.

3. **Delete and clean imports:**
   ```bash
   rm <offending-file>
   # Clean imports referencing the deleted file
   pnpm typecheck 2>&1 | grep -c "error TS"
   ```
   Repeat until count is 0.

4. **Re-run** — previously blocked nodes will pass.

**Verification:** `pnpm typecheck` exits 0. Next run shows `CHECK_PASS` for the typecheck check.

---

## 8. Verification task expects browser/server E2E inside an AI spawn

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

## 9. Mixed-shape task: file-creation + tree-wide cleanup in one task

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

## 10. Cycle detected in DAG

**Symptom:**
```
CYCLE_DETECTED [id1 → id2 → id3 → id1]
```
Compile fails. The DAG has a circular dependency.

**Root cause:** `depends_on` edges form a cycle. Usually happens when two tasks each declare the other as a dependency, or a chain loops back.

**Fix recipe:**

1. Trace the cycle shown in the error.
2. Identify which edge is incorrect — which task does NOT actually need to depend on the other.
3. Remove or fix the `depends_on` entry in the offending TASK.md or playbook.yml.
4. Re-compile:
   ```bash
   converge compile <playbook.yml>
   ```

**Verification:** Compile succeeds. `manifest.json` written without errors.

---

## 11. Frontier unresolved — seed spawned no children

**Symptom:**
```
FRONTIER_UNRESOLVED <nodeId>
```
A seed parent declared with `from_seed` and an upstream catalog was expected to spawn children, but the DAG shows zero child nodes.

**Root cause:** Either (a) the catalog file is empty/missing, or (b) the seed script errored silently, or (c) the catalog format changed and the seed didn't match any entries.

**Fix recipe:**

1. Check the catalog file exists and has entries:
   ```bash
   cat <catalog-path> | jq 'length'  # or equivalent
   ```
2. Run the seed script manually to see errors:
   ```bash
   node <playbook>/seeds/<name>/index.js
   ```
3. Fix the catalog or seed script.
4. Re-compile with `--seed` to resolve frontiers:
   ```bash
   converge compile <playbook.yml> --seed
   ```

**Verification:** Compile succeeds. `SEED_SPAWN` events appear during run showing the expected child count.

---

## 12. Fingerprint mismatch cascade — all downstream re-executes

**Symptom:** An incremental run (`--select 'state:modified+'`) re-executes far more nodes than expected. Nodes that shouldn't have changed show `NODE_COMPLETE fresh` instead of `cached`.

**Root cause:** A node's fingerprint changed unexpectedly — often because a TASK.md was touched (even whitespace), a `vars:` value changed, or the manifest hash differs due to a re-compile that produced a different DAG structure.

**Fix recipe:**

1. Check what actually changed:
   ```bash
   diff <(jq -S . target/<playbook>/manifest.prev.json) <(jq -S . target/<playbook>/manifest.json)
   ```
2. If the diff is noise (whitespace, key ordering), the fingerprint computation is too broad. This is a framework issue — surface to the user.
3. If the diff is real (a `depends_on` edge changed, a `vars:` value updated), the cascade is correct behavior. Let it run.

**Verification:** After a clean run, the next `--select 'state:modified+'` should show all `cached` (zero `fresh`).

---

## When NONE of these match

If your symptom isn't covered above:

1. **Read the node forensics:**
   ```bash
   ls target/<playbook>/tasks/<nodeId>/
   cat target/<playbook>/tasks/<nodeId>/FEEDBACK.md
   cat target/<playbook>/tasks/<nodeId>/LEARN.md
   ```
2. **Check the event stream** around the failure:
   ```bash
   grep "NODE_FAIL\|CHECK_FAIL\|ERROR" target/<playbook>/events.jsonl | tail -20
   ```
3. **Surface to the user** with: failing node ID, exact event lines, what you've tried, your hypothesis, and a proposed fix.
4. Wait for approval before applying any patch.
