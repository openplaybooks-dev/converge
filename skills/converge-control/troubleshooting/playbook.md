# Converge troubleshooting playbook

Symptom-indexed fixes for the run-blockers we know how to solve. Each entry is **symptom → root cause → fix recipe → verification**.

If your symptom isn't in this file, **STOP** and surface to the user with: failing task ID, exact log lines, what you've tried, and a proposed fix. Don't improvise patches on novel symptoms.

## Quick index

1. [Iteration cap reached](#1-iteration-cap-reached)
2. [Previous session cancelled — refuses to launch](#2-previous-session-cancelled--refuses-to-launch)
3. [Stale `outputs:` paths after workflow moved files](#3-stale-outputs-paths-after-workflow-moved-files)
4. [Stale `inputs:` blocking a task that should be ready](#4-stale-inputs-blocking-a-task-that-should-be-ready)
5. [Missing WBS sub-template subdirectory](#5-missing-wbs-sub-template-subdirectory)
6. [Foreign playbook hijacks `converge run`](#6-foreign-playbook-hijacks-converge-run)
7. [WBS-script self-repair self-test fails (ignorable)](#7-wbs-script-self-repair-self-test-fails-ignorable)
8. [Tree doesn't see WBS-spawned children — phase stuck `seeded`](#8-tree-doesnt-see-wbs-spawned-children--phase-stuck-seeded)
9. [Parent stays `seeded` while all children show complete](#9-parent-stays-seeded-while-all-children-show-complete)
10. [Secondary playbook fails after main one finishes](#10-secondary-playbook-fails-after-main-one-finishes)
11. [Pre-existing typecheck/build errors in vendored code](#11-pre-existing-typecheckbuild-errors-in-vendored-code)
12. [Verification task expects browser/server E2E inside an AI spawn](#12-verification-task-expects-browserserver-e2e-inside-an-ai-spawn)
13. [Mixed-shape task: file-creation + tree-wide cleanup in one task](#13-mixed-shape-task-file-creation--tree-wide-cleanup-in-one-task)

---

## 1. Iteration cap reached

**Symptom (exact):**
```
⚠️  Max iterations (100) reached. Use --max-iterations to increase.
```
Run process exits 0 but `converge <playbook.yml> status` still shows pending tasks.

**Root cause:** The `--max-iterations` flag (default 100) was too low for the playbook size. Long playbooks routinely need 200-500 iterations.

**Fix:**

```bash
# 1. Confirm process exited
ps aux | grep "node.*cli" | grep -v grep || echo "stopped"

# 2. Relaunch with higher cap and --resume
node /path/to/converge/packages/cli/dist/index.js \
  .converge/playbooks/<name>/playbook.yml run \
  --resume --max-iterations 250
```

Bump the cap further (500, 1000) on very large playbooks.

**Verification:** Monitor sees `── Iteration N ──` continue past the previous cap, and `📍 Progress: X/Y` keeps growing.

---

## 2. Previous session cancelled — refuses to launch

**Symptom (exact):**
```
⛔ Previous session exited with status: cancelled

   Session:    <timestamp>-<id>
   Status:     cancelled
   Ended:      Nm ago
   Progress:   X completed, Y failed (N iterations)

To continue, use one of:
   converge run --resume    # recover and continue from where it stopped
   converge run --restart   # reset non-complete tasks and start fresh
```

**Root cause:** The previous session was killed (process kill, crash, system reboot) without a clean exit. The CLI requires explicit acknowledgement.

**Fix:** add `--resume`. **Never** use `--restart` mid-project — it nukes finished work.

```bash
node .../cli/dist/index.js <playbook.yml> run --resume --max-iterations 250
```

**Verification:** Launch proceeds without the refusal banner; `📍 Progress:` resumes near where the previous session left off.

---

## 3. Stale `outputs:` paths after workflow moved files

**Symptom (exact):**
```
❌ Validation failed
   ✗ <taskId>-missing-output-<path>: Task output not created: <path>
   ✗ <taskId>-check-failed-widget-exists: Check failed: Widget file exists
```

The path in the error points to a location that's *empty on disk*, but the file actually exists at a *different* location. Most commonly: a `split` task declares output at `lib/screens/X/widgets/foo.dart`, a follow-up `lift` task moves it to `lib/widgets/foo.dart`, and a later resume revalidates the split task — which fails because the file is no longer at the original location.

**Root cause:** TASK.md frontmatter declares an `outputs:` path that's correct at the time of generation but stale after later steps move the file.

**Fix recipe:**

1. **Patch the template** so future spawns don't have the same problem:
   ```yaml
   # in the template TASK.md frontmatter — drop the brittle outputs:
   inputs:
     - "{{screenPath}}"
   checks:
     - id: widget-exists
       cmd: "bash -c 'test -f {{widgetPath}} || test -f lib/widgets/$(basename {{widgetPath}})'"
       description: "Widget file exists at local path or has been lifted"
     - id: dart-valid
       cmd: "bash -c 'p={{widgetPath}}; if [ -f \"$p\" ]; then dart analyze \"$p\"; else dart analyze lib/widgets/$(basename \"$p\"); fi'"
   # NOTE: outputs: is removed entirely — the checks above gate correctness
   ```

2. **Patch all already-materialized journal copies.** The runner reads from `journal/<playbook>/tasks/<path>/TASK.md`, not from the template, for already-spawned tasks. Find them:
   ```bash
   find .converge/journal/<playbook>/tasks -path "*-split-*/TASK.md" -not -path "*/attempts/*"
   ```
   For each, regenerate from the now-fixed template using the existing `vars:` block. Pattern:
   ```python
   import re, yaml
   raw = open(path).read()
   m = re.search(r'^vars:\n((?:  \w[^\n]*\n)+)', raw, re.M)
   vars_yaml = yaml.safe_load("vars:\n" + m.group(1))['vars']
   tpl = open(template_path).read()
   rendered = tpl
   for k, v in vars_yaml.items():
       rendered = rendered.replace("{{" + k + "}}", "" if v is None else str(v))
   body_end = rendered.find("---", 3)
   final = rendered[:body_end] + "vars:\n" + m.group(1) + rendered[body_end:]
   open(path, 'w').write(final)
   ```

3. **Relaunch:**
   ```bash
   pkill -9 -f "node.*cli/dist/index.js run"
   node .../cli/dist/index.js <playbook.yml> run --resume --max-iterations 250
   ```

**Verification:** `converge <playbook.yml> status` no longer flags the failed validations; the affected task moves to `complete`.

---

## 4. Stale `inputs:` blocking a task that should be ready

**Symptom (exact):**
```
❌ Task cannot execute: 1 blocker(s) still unresolved
  - [<taskId>] Missing required input: <local-path>
```

The blocker path doesn't exist because a previous step moved the file. Common with `lift` subtasks whose `inputs:` reference the local widget path that `split` produced and `lift` itself moves.

**Root cause:** The blocking-input check is too strict. The file existed when the task was queued, but downstream movement broke the path.

**Fix recipe:**

1. **Drop the brittle input from the template:**
   ```yaml
   # in template TASK.md
   # was:
   #   inputs:
   #     - "{{localWidgetPath}}"
   #   outputs:
   #     - "{{sharedWidgetPath}}"
   # now:
   outputs:
     - "{{sharedWidgetPath}}"
   ```

2. **Patch already-materialized journal copies** (same regen pattern as fix #3).

3. **Relaunch with `--resume`.**

**Verification:** Task moves past the blocker on the next iteration; `❌ Task cannot execute` doesn't recur for that task ID.

---

## 5. Missing WBS sub-template subdirectory

**Symptom (exact):**
```
[wbs:<taskId>] ❌ WBS execution failed: WBS script import failed: <path>/wbs.js
[wbs:<taskId>] 🔧 Attempting to fix gap: wbs-script-error:<taskId>:<timestamp>
```

The wbs.js exists and parses, but its `run()` references a sub-template (e.g. `tasks/subtask/TASK.md`) that's not on disk.

**Root cause:** When scaffolding a v2 playbook from a v1 source, the sub-template directories (`split/tasks/subtask/`, `lift/tasks/subtask/`) were missed in the copy.

**Fix recipe:**

1. Find a known-good source (the v1 example or sibling project) that has the sub-template:
   ```bash
   find <source>/wbs/templates -type d -name "subtask"
   ```

2. Copy into both pipeline variants of the new playbook:
   ```bash
   for pipeline in screen-with-reference screen-without-reference; do
     for step in "{{prefix}}-05-split" "{{prefix}}-06-lift"; do
       mkdir -p "<v2>/wbs/templates/$pipeline/tasks/$step/tasks/subtask"
       cp "<source>/.../tasks/$step/tasks/subtask/TASK.md" \
          "<v2>/wbs/templates/$pipeline/tasks/$step/tasks/subtask/TASK.md"
     done
   done
   ```

3. **Backfill any already-materialized step dirs** that ran before the fix:
   ```bash
   for step_dir in $(find <v2>/.converge/journal/.../tasks -type d -name "*-05-split" -o -name "*-06-lift"); do
     [ -d "$step_dir/tasks/subtask" ] && continue
     mkdir -p "$step_dir/tasks/subtask"
     cp "<source-template>/TASK.md" "$step_dir/tasks/subtask/TASK.md"
   done
   ```

4. Relaunch with `--resume`.

**Verification:** `❌ WBS execution failed` doesn't recur; the WBS script spawns children successfully (visible as `🎬 Starting: Split: <widget>` events).

---

## 6. Foreign playbook hijacks `converge run`

**Symptom:** Run completes the intended playbook, then immediately starts running tasks from a different playbook (e.g. `realdevice` after `default`). The other playbook fails because it expects platform setup that hasn't happened.

```
⛔ Validation failed
   ✗ 01-add-native-platforms-missing-output-android/app/build.gradle: ...
```

**Root cause:** `.converge/playbooks/` contains more than one playbook. Plain `converge run` walks them all in order. The current playbook the user cares about isn't necessarily the one the CLI picks next.

**Fix:** Use the explicit playbook-path form on every command:

```bash
# Run only the intended playbook
node .../cli/dist/index.js \
  .converge/playbooks/default/playbook.yml run --resume --max-iterations 250

# Status only for the intended playbook
node .../cli/dist/index.js \
  .converge/playbooks/default/playbook.yml status
```

If the foreign playbook is genuinely unwanted, also: delete or move `.converge/playbooks/<other>/` after confirming with the user.

**Verification:** `converge run` only starts tasks from the intended playbook. No cross-playbook task IDs in the event stream.

---

## 7. WBS-script self-repair self-test fails (ignorable)

**Symptom (exact):**
```
[self-test] FAIL: var-featureId - Variable 'featureId' not found in code
[self-test] FAIL: var-featureTitle - Variable 'featureTitle' not found in code
[self-test] FAIL: syntax - Syntax error: Cannot use import statement outside a module
[wbs-script-repair] Self-test failed: ...
```

**Root cause:** The runner's wbs-script auto-repair runs a generic self-test with placeholder variables (`featureId`, `featureTitle`) that don't apply to every wbs.js. The test fails on a perfectly valid script.

**Fix:** **Ignore.** Then verify the next iteration shows progress on the parent task. Specifically, look for `🎬 Starting: <child task>` for the WBS parent — that confirms spawning still works despite the failed self-test.

If, on the next iteration, the parent task ID hasn't moved AND the WBS hasn't spawned children → escalate; the wbs.js may genuinely be broken, beyond the false-alarm self-test.

**Verification:** `🎬 Starting: <child task>` appears within 1-2 iterations after the self-test failure.

---

## 8. Tree doesn't see WBS-spawned children — phase stuck `seeded`

**Symptom:** A WBS-driven phase like `03-build-screens` stays `seeded` in `converge status` even though the actual screen widgets exist on disk and pass `dart analyze`. Status shows `0/10 done` while the filesystem shows all 10 generated.

**Root cause:** WBS-spawned TASK.md files are materialized under `.converge/journal/<playbook>/tasks/...`, not `.converge/playbooks/<playbook>/tasks/...`. The CLI's tree-builder scans only `playbooks/`, so it doesn't see the journal-only children. The parent rollup sees zero "known" children and can't auto-complete.

**Fix:** This is now handled by the framework's rollup logic — it scans the journal `tasks/` subdir and synthesizes virtual children. To trigger it manually:

```bash
# Calling status alone runs the parent-rollup pass
node .../cli/dist/index.js <playbook.yml> status
```

If after `status` the phase still shows `seeded`:

1. Verify on disk first — the work may genuinely be incomplete:
   ```bash
   # for a phase like 03-build-screens
   ls lib/screens/                              # should have all expected screens
   find lib/screens -name "*_screen.dart" | wc -l
   find lib/screens -name "*_states.dart" | wc -l
   ```

2. If files exist but status is still wrong, run `verify --fix`:
   ```bash
   converge verify --fix
   ```

3. If still stuck, the rollup may need a manual nudge — surface to the user. Don't manually edit checkpoint.json files.

**Verification:** `converge <playbook.yml> status` shows phase `✓ complete` with `[X/X done]` matching the on-disk count.

---

## 9. Parent stays `seeded` while all children show complete

**Symptom:** A phase has all its direct children marked `✓` but the phase itself shows `◑ seeded`. `converge status` may print warnings like:
```
⚠️  WBS parent <id> marked complete but has no children — reverting to pending
```

**Root cause:** Same family as #8 — rollup didn't propagate. Often happens when a deeper grandchild was force-resolved (manual file edit) and the chain didn't catch up.

**Fix:**

1. Run `status` to trigger the rollup pass:
   ```bash
   node .../cli/dist/index.js <playbook.yml> status
   ```
   Look for `↻ Auto-completed parent: <id>` events. They should cascade up the tree.

2. If `status` doesn't auto-complete it, check the children's `progress` block:
   ```bash
   cat .converge/journal/<playbook>/tasks/<phase>/checkpoint.json | python3 -m json.tool
   ```
   If `progress.completedChildren === totalChildren`, the work is genuinely done; the framework should mark it complete on next status. If `completedChildren < totalChildren`, find the unfinished child (look for ones not in the `complete` set) and resolve it normally.

3. Last resort, surface to the user. Don't hand-edit checkpoint.json.

**Verification:** Phase shows `✓ complete` after `status` runs.

---

## 10. Secondary playbook fails after main one finishes

**Symptom:** The primary playbook completes successfully, then `converge run` starts a secondary playbook that fails immediately on platform / setup issues (e.g. `01-add-native-platforms` fails because `flutter create` was never run).

**Root cause:** The user only wants the primary playbook for this session, but `.converge/playbooks/` has additional playbooks that get picked up automatically.

**Fix:** Two options — confirm with the user before either:

**Option A — isolate to the primary playbook for this session:**

```bash
# Always invoke with the explicit playbook path
node .../cli/dist/index.js \
  .converge/playbooks/<primary>/playbook.yml run --resume --max-iterations 250
```

**Option B — sideline the secondary playbook permanently:**

```bash
# Move it out of the playbooks dir
mv .converge/playbooks/<secondary> /tmp/<secondary>-archived
# Or remove it entirely if not needed
rm -rf .converge/playbooks/<secondary>
```

Use option A first (less destructive). Use option B only if the user confirms the secondary playbook isn't needed.

**Verification:** `converge run` no longer starts tasks from the secondary playbook. The primary playbook completes cleanly.

---

## 11. Pre-existing typecheck/build errors in vendored code

**Symptom:** A `typecheck` or `build` check fails identically across many tasks. Inspecting the output reveals the failing file isn't anything the AI just wrote — it's a file that was already in the repo before the run started (commonly: code copied in from an upstream fork, a vendored dep with type drift, a dead module the playbook didn't think to prune).

```
src/components/panels/system-monitor-panel.tsx(196,19): error TS2322: ...
src/components/panels/system-monitor-panel.tsx(232,19): error TS2322: ...
```

**Root cause:** the playbook's `typecheck` check is "all-or-nothing" — it fails if there are *any* errors, even ones that pre-date this run. Once vendored code is wedged, every downstream task with the same check will fail forever.

**Fix recipe (1-time prune, then resume):**

1. **Identify the offending file(s)**:
   ```bash
   pnpm --filter @<pkg> typecheck 2>&1 | grep "error TS" | head -20
   ```

2. **Decide**: are these files ones the playbook was going to use? If yes, fix the types. If no (vestigial vendored code), delete them. Most cases are #2 — you forked a generic upstream dashboard / framework and the file is feature-bloat you didn't need.

3. **Delete and clean imports**:
   ```bash
   rm <offending-file>
   grep -rln "import.*<offending-symbol>" src | xargs sed -i '' '/<offending-symbol>/d'
   pnpm --filter @<pkg> typecheck 2>&1 | grep -c "error TS"
   ```
   Repeat until count is 0.

4. **Resume the run** with `--resume`. The previously-blocked tasks will pass on the next CHECK pass (now that the typecheck check returns 0 errors).

**Prevention** (in the playbook itself, not the framework):
- Add a Phase 01 "prune-vendored-debt" task that runs typecheck and deletes any pre-existing failing files BEFORE downstream tasks need typecheck-clean state.
- Or scope typecheck checks to a subset path: `pnpm --filter @<pkg> typecheck -- --noEmit src/lib/converge-adapter` instead of the whole package.

**Verification:** `pnpm --filter @<pkg> typecheck 2>&1 | grep -c 'error TS'` returns `0`. The next attempt's FEEDBACK.md shows the typecheck check passing.

---

## 12. Verification task expects browser/server E2E inside an AI spawn

**Symptom:** A task says "spin up `pnpm dev`, curl `localhost:N`, exercise pages, write a JSON report with `allPassed: true`". The AI tries — runs `pnpm dev &`, curls, sometimes runs aggressive cleanups like `pkill -f "node"` (which can kill the *runner itself*) — and either times out, deadlocks on a port, or scaffolds a report with all `false` and the gate stays red forever.

**Root cause:** convergence loops have no port management, no headless browser, no reliable way to "start a long-lived server, query it, kill it cleanly" inside an attempt. AI spawns are designed for file edits + short shell commands, not multi-process choreography.

**Fix recipe — restructure the task, not the runner:**

1. **Drop the `allPassed === true` gate.** Replace it with a "report file exists + has expected schema" check:
   ```yaml
   checks:
     - id: report-written
       description: E2E verification report exists with expected schema (human review required for verdicts)
       cmd: "test -f .converge/<state>/e2e-verify.json && node -e \"const r=JSON.parse(require('fs').readFileSync('.converge/<state>/e2e-verify.json','utf8'));process.exit(Array.isArray(r.scenarios)&&r.scenarios.length>0?0:1)\""
   ```

2. **Reframe the task body** as "scaffold the report file, leave verdicts as `null`/`false` for human review." The AI's job is to produce the *checklist*, not run it.

3. **Add a separate human runbook** (`docs/e2e-checklist.md` or similar) that humans walk through after the playbook completes. The checklist mirrors `scenarios[]` in the JSON file.

4. **If you genuinely need automated E2E**, structure as TWO tasks:
   - Task A (in playbook): spawn `pnpm dev`, write a `pid` and `port` file, exit immediately.
   - Task B (in playbook, depends on A): run a smoke script that reads the pid/port, hits endpoints, kills the pid, writes the report.
   - This still has port-collision risk but at least the AI isn't trying to do everything in one attempt.

**Anti-patterns to avoid in playbook authoring:**
- ❌ `pkill -f "node"` or `pkill -f "converge"` — will kill the runner.
- ❌ `pnpm dev &; sleep 8; curl ...; kill %1` — backgrounded job survival is unreliable across AI shells.
- ❌ "Verify all 12 scenarios pass" gate on a task that has 1 attempt budget.

**Verification:** Task either passes its (relaxed) gate cleanly OR is split into spawn-and-smoke variants that converge in <2 attempts each. No `pkill -f "node"` in any task body.

---

## 13. Mixed-shape task: file-creation + tree-wide cleanup in one task

**Symptom:** A single task takes 15+ minutes and 2+ attempts to converge. The check list contains both "new file X exists" (`test -f some/path.ts`) AND "no occurrences of pattern Y in src/" (`grep -r 'badPattern' src | wc -l | xargs test 0 -eq`). Each attempt scrubs a few files but new ones keep being found because the AI grep-cleans the tree iteratively.

`converge verify` will surface this at authoring time:

```
[structure/warning] mixed-shape-checks: Task mixes existence checks (route-exists, hook-exists)
  with tree-wide negation checks (no-legacy-websocket).
  This shape systematically needs ≥2 attempts to converge.
```

**Root cause:** existence and negation checks converge at different rates. Existence flips from false → true once when the file is written. Negation drains chunk-by-chunk over many edits. A task with both can only complete when *both* shapes finish, so its attempt count is bounded below by the slower shape — but the AI also has to do the existence work in attempt 1, which crowds out cleanup time.

**Fix recipe — split into creator + cleanup, two sibling tasks:**

```yaml
# Before (one task, slow):
- id: 009-converge-event-stream
  outputs:
    - src/app/api/events/route.ts
    - src/lib/use-converge-events.ts
  checks:
    - id: route-exists
      cmd: "test -f src/app/api/events/route.ts"
    - id: hook-exists
      cmd: "test -f src/lib/use-converge-events.ts"
    - id: no-legacy-websocket
      cmd: "test -z \"$(grep -rl 'useWebSocket\\|gateway-ws' src 2>/dev/null)\""

# After (two tasks, fast):
- id: 009-converge-event-stream
  outputs:
    - src/app/api/events/route.ts
    - src/lib/use-converge-events.ts
  checks:
    - id: route-exists
      cmd: "test -f src/app/api/events/route.ts"
    - id: hook-exists
      cmd: "test -f src/lib/use-converge-events.ts"

- id: 009b-purge-legacy-websocket
  dependencies: [009-converge-event-stream]
  checks:
    - id: no-legacy-websocket
      cmd: "test -z \"$(grep -rl 'useWebSocket\\|gateway-ws' src 2>/dev/null)\""
    - id: no-broken-imports
      cmd: "pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
```

The creator task converges in 1 attempt (drops file → existence flips). The cleanup task converges in 1–2 attempts (mechanical grep-and-delete with a hard "must be zero" gate). Total wall-clock is *less* than the merged version because the AI isn't context-switching between unrelated work.

**When the lint may yield false positives:**
- A task that creates a file AND verifies its content via grep negation (e.g. `! grep 'TODO' src/lib/converge-adapter/paths.ts`) — that's not tree-wide. The lint pattern catches `-r` recursive variants only, but reading the warning and confirming is faster than disabling the rule.

**Verification:** `converge verify` no longer flags the task. The (now) single-shape tasks each converge in 1–2 attempts. No 15-minute attempts in the run.

---

## When NONE of these match

If your symptom isn't covered above:

1. **Stop the run.** Don't keep killing/relaunching with no plan.
2. **Read the per-task journal forensics:**
   ```bash
   J=.converge/journal/<playbook>/tasks/<failing-task-path>
   cat $J/checkpoint.json | python3 -m json.tool
   cat $J/attempts/01/FEEDBACK.md
   cat $J/attempts/01/CHECK.md
   cat $J/attempts/01/LEARN.md
   tail -50 $J/attempts/01/logs/events.jsonl
   ```
3. **Surface to the user** with: failing task ID, exact log lines, what you've tried, your hypothesis, and a proposed fix.
4. Wait for approval before applying any patch.
