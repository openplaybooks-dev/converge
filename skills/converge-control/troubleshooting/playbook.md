# Converge troubleshooting playbook

Symptom-indexed fixes for the run-blockers we know how to solve. Each entry is **symptom → root cause → fix recipe → verification**.

If your symptom isn't in this file, **STOP** and surface to the user with: failing node ID, exact event lines, the check that failed, what you've tried, and a proposed fix. Don't improvise patches on novel symptoms.

## Quick index

1. [Previous run cancelled — node status unclear](#1-previous-run-cancelled--node-status-unclear)
2. [Stale `outputs:` paths after workflow moved files](#2-stale-outputs-paths-after-workflow-moved-files)
3. [Stale `inputs:` blocking a node that should be ready](#3-stale-inputs-blocking-a-node-that-should-be-ready)
4. [Missing spawner template directory](#4-missing-spawner-template-directory-rfc-00210022)
5. [Foreign playbook hijacks `converge run`](#5-foreign-playbook-hijacks-converge-run)
6. [Secondary playbook fails after main one finishes](#6-secondary-playbook-fails-after-main-one-finishes)
7. [Pre-existing typecheck/build errors in vendored code](#7-pre-existing-typecheckbuild-errors-in-vendored-code)
8. [Verification task expects browser/server E2E inside an AI spawn](#8-verification-task-expects-browserserver-e2e-inside-an-ai-spawn)
9. [Mixed-shape task: file-creation + tree-wide cleanup in one task](#9-mixed-shape-task-file-creation--tree-wide-cleanup-in-one-task)
10. [Cycle detected in DAG](#10-cycle-detected-in-dag)
11. [Frontier unresolved — spawner produced no children](#11-frontier-unresolved--spawner-produced-no-children)
12. [Fingerprint mismatch cascade — all downstream re-executes](#12-fingerprint-mismatch-cascade--all-downstream-re-executes)
13. [HTTP 401 / Invalid API key on the first task — environment-vs-playbook conflict](#13-http-401--invalid-api-key-on-the-first-task--environment-vs-playbook-conflict)

---

## 1. Previous run cancelled — node status unclear

**Symptom:**
```
RUN_CANCELLED <playbook>
```
Or the run process was killed and you're unsure what completed.

**Root cause:** The previous run was interrupted (SIGTERM, crash, reboot) without completing all nodes.

**Fix:** Re-run. On startup the runner prefers `runstate.json` (per-machine), and falls back to hydrating from the committed `inventory/<playbook>/tasks.jsonl` if it's missing (e.g. fresh clone — RFC 0025). Completed nodes carry forward via fingerprint cache, incomplete nodes execute fresh. The run starts with a one-line `reconciled (pb): N cached · M reset (TASK.md changed) · K reset (output missing) · L new` summary. No special flags needed.

```bash
converge run --playbook=<name>
```

To explicitly retry only nodes that failed (not were cancelled):

```bash
converge run --playbook=<name> --select 'result:error+'
```

Do **not** use `converge clean --all` — it ignores the previous runstate and re-executes everything.

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

2. **Regenerate already-spawned nodes.** Spawned-child contracts live at `.converge/journal/<playbook>/tasks/<parent>/exec/spawn/<id>/EXPANDED.md` (RFC 0030 — single source of truth). Either re-run the spawner parent (which re-renders EXPANDED.md from the fixed template against the stored params) or surgically reset affected children with `converge reset <id>` so the next run re-spawns them.

3. **Re-compile and re-run:**
   ```bash
   converge run --playbook=<name> --dry
   converge run --playbook=<name> --select 'result:error+'
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
   converge run --playbook=<name> --dry
   converge run --playbook=<name> --select 'result:error+'
   ```

**Verification:** Node moves past the input gate. `INPUT_MISSING` doesn't recur.

---

## 4. Missing spawner template directory (RFC 0021/0022)

**Symptom:**
```
NODE_FAIL <spawnerId> spawner-apply-failed
```
A `mode: spawner` body wrote one or more `<id>/spawn.yml` invocations (or, for legacy bodies, rows in `spawn.plan.jsonl`), but expansion rejected the invocation with `template-not-found` — the named template doesn't exist under `templates/<name>/`.

**Root cause:** When migrating or copying a playbook, template directories were missed.

**Fix recipe:**

1. Read `$CONVERGE_SPAWN_DIR/STATUS.md` (RFC 0024) to see which `- [ ]` row carries `template-not-found` and which file to edit; or, for legacy bodies, `$CONVERGE_TASK_DIR/spawn.plan.result.jsonl`.

2. Locate the missing template in a known-good source:
   ```bash
   find <source-playbook>/templates/ -maxdepth 2 -name 'TASK.md'
   ```

3. Copy the template tree into the target playbook (the directory should contain `TASK.md` + `PARAMS.yml` + optional `EXAMPLES.yml`):
   ```bash
   cp -r <source-playbook>/templates/<name> <target-playbook>/templates/<name>
   ```

4. Re-run the parent; the spawner body will re-emit the invocations (re-runs with byte-identical `spawn.yml` are no-ops).

**Verification:** `STATUS.md` shows `- [x]` for every row (or `spawn.plan.result.jsonl` shows `ok: true` per row for legacy bodies). `SEED_SPAWN` event appears in the stream and the children execute.

---

## 5. Foreign playbook hijacks `converge run`

**Symptom:** Run completes the intended playbook, then starts running tasks from a different playbook. The other playbook fails because it expects setup that hasn't happened.

**Root cause:** `.converge/playbooks/` contains more than one playbook. A bare `converge run` may pick a different one than intended.

**Fix:** Use the explicit playbook path on every command:

```bash
converge run --playbook=default
converge list --playbook=default
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
4. Re-validate the graph:
   ```bash
   converge run --playbook=<name> --dry
   ```

**Verification:** Dry run succeeds. No cycle error is reported.

---

## 11. Frontier unresolved — spawner produced no children

**Symptom:**
```
FRONTIER_UNRESOLVED <nodeId>
```
A `mode: spawner` (or `mode: converger`) parent was expected to spawn children, but the DAG shows zero child nodes. The corresponding `$CONVERGE_TASK_DIR/mode-violation.json` typically reports one of: `spawner-missing-manifest`, `spawner-empty-manifest`, `spawner-row-count`, or `spawner-apply-failed`.

**Root cause:** Either (a) the body wrote no `<id>/spawn.yml` invocations (and no legacy `spawn.plan.jsonl`), (b) the body wrote zero invocations but `spawn.min_children: 1` (or higher) is declared, (c) every invocation was rejected during preview (template-not-found, missing-required-param, unknown-param, param-type-mismatch — see `STATUS.md` for the per-child `fix:` blocks), or (d) the input catalog the body reads is empty/missing.

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
4. Fix the input or the body. The framework will re-apply on the next run; byte-identical `spawn.yml` content is a no-op.

**Verification:** `mode-violation.json` is absent. `STATUS.md` shows `- [x]` for every row (or `spawn.plan.result.jsonl` shows `ok: true` per row for legacy bodies). `SEED_SPAWN` events appear during run showing the expected child count.

---

## 12. Fingerprint mismatch cascade — all downstream re-executes

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

## When NONE of these match

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

---

## 13. HTTP 401 / Invalid API key on the first task — environment-vs-playbook conflict

**Symptom:**

The first task fails almost immediately (~1–2 seconds) with one of:

```
Invalid API key · Fix external API key
HTTP 401 / api_error_status 401
Agent failed [crash]: Process exited with code 1
```

`converge inspect --task=<first-task-id>` shows the spawned agent process never reached the model — it died on the auth handshake. After three retries the run halts on a repeat-failure detector.

**Root cause:**

The spawned agent CLI (`claude`, `codex`, …) inherits the shell's `ANTHROPIC_*` / `OPENAI_*` / `CLAUDE_*` env vars. When those vars are set from a previous setup (a proxy, an old MiniMax / DeepSeek session, a nested Claude Code host, or stale credentials), they **override** the `env:` block declared in `.converge/project.yaml` for the chosen provider. The agent authenticates against the wrong endpoint with the wrong credential and gets a clean 401.

The playbook is fine. The execution environment is misconfigured.

**Fix:**

1. **Inspect the loose env vars:**
   ```bash
   env | grep -E 'ANTHROPIC_|OPENAI_|CLAUDE_CODE_'
   ```
2. **Inspect what the project.yaml expects:**
   ```bash
   grep -A20 '^ai:' .converge/project.yaml
   ```
3. **Reconcile.** Three correct paths, pick one and make the shell match:
   - **Claude OAuth path** — keep `claude login` credentials at `~/.claude/.credentials.json`; **unset** all `ANTHROPIC_*` shell vars so they don't override:
     ```bash
     unset ANTHROPIC_BASE_URL ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL
     ```
   - **Direct Anthropic API key** — export `ANTHROPIC_API_KEY=sk-ant-…`; unset the proxy-only vars:
     ```bash
     export ANTHROPIC_API_KEY=sk-ant-...
     unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL
     ```
   - **Proxy routing (MiniMax / DeepSeek / OpenRouter)** — the canonical fix is to re-scaffold so the routing lives in `project.yaml`:
     ```bash
     converge init --force --backend=claude --provider=minimax   # or =deepseek
     export MINIMAX_API_KEY=...   # or DEEPSEEK_API_KEY, per provider
     unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL
     ```
4. **Re-run the playbook:**
   ```bash
   converge run --playbook=<name> --resume
   ```

**Verification:**

The first task should complete (or fail differently) within the first 30 seconds. If you still see HTTP 401, the shell still has stray overrides — re-run step 1 and unset whatever's there.

**Why this isn't a playbook bug:**

The same `.converge/project.yaml` works in a clean shell. The conflict is purely about shell-env precedence over `project.yaml`'s `env:` block when the agent CLI is spawned. Don't patch the playbook to compensate.
