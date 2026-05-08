# Converge run output — event catalog

Every distinct pattern that appears in `converge run` output, what it means, what to do.

Use this when:

- Composing the Monitor `grep -E` filter
- Classifying a single event during a run
- Debugging "what was happening when the run died?"

## How to read this file

Each entry is:

```
<class>  <pattern (verbatim or regex)>
  <one-line meaning>
  → <action>
```

Patterns are quoted exactly as the CLI emits them. The leading whitespace in real output is variable; the patterns below match the trimmed form.

## Recommended Monitor filter

```bash
grep -E --line-buffered "(❌|FAIL|Error|Exception|Overloaded|Max iterations|did not converge|Validation failed|seeding failed|Task.*completed|Starting:|Iteration|Progress:|All gaps resolved|Auto-completed parent|exited)"
```

This catches all real signals while dropping the cosmetic `⚠️ project.yaml not found` warning.

---

## Progress signals — keep watching

```
🎬 Starting: <task title>
```
A task just began. Forward progress.
→ continue.

```
── Iteration N ──────────────────────────────────
```
Top-level iteration counter (capped by `--max-iterations`). Increments roughly once per task.
→ continue. Watch for `Max iterations (N) reached`.

```
📍 Progress: X/Y tasks complete
```
Real progress. X grows as tasks finish.
→ continue.

```
✅ All gaps resolved
```
Current task converged. The runner will move on.
→ continue.

```
↻ Auto-completed parent: <id> (X/Y children done)
```
A seed parent rolled up to complete because all children finished.
→ continue. Strong sign progress is sticking.

---

## Spawn lifecycle — informational

```
🤖 Running AI
   Task  : <title>
   Phase : run_task
   Logs  : <path>
   Prompt: N lines, M chars
```
The runner is invoking the AI for one attempt of the current task.
→ continue.

```
📡 Streaming logs from: <log path>
```
AI session log is being tailed.
→ continue.

```
✅ Task completed
```
**Misleading name.** This is a *spawn* completing, not the task as a whole. The convergence loop runs many spawns per task. Wait for either (a) `🎬 Starting: <next task>` or (b) `✅ All gaps resolved` to know the *task* is done.
→ continue. Don't celebrate yet.

```
📋 FEEDBACK.md written (N check(s) failed)
```
Per-attempt summary. Normal on first attempt — the runner will retry. Becomes alarming only if the same task hits attempt 3 with the same failures.
→ continue unless attempt counter is climbing without progress.

---

## Convergence loop — informational

```
💭 Starting convergence loop for task: <title>
   └─ maxIterations: 100
```
Inner per-task loop is starting. The 100 here is the per-task cap (separate from `--max-iterations`).
→ continue.

```
🔍 Gap detected: [<taskId>] <description>
   └─ Kind: check-failed | output | blocker
```
The runner found a gap (failed check, missing output, unmet input) and will try to fix it. **Multiple gap-detected lines on the same task are normal early in its lifecycle.**
→ continue.

```
📘 LEARN.md generated (N failed check(s) documented)
```
The AI wrote its own analysis of the failure into LEARN.md. The next attempt will read it.
→ continue.

```
Verifying outputs...
Verified: N/M gap(s) resolved
```
Post-attempt validation. M is the gap count when the attempt started.
→ continue. If `0/M` repeats, the AI isn't making progress — diagnose.

```
✅ Done in Ns
   ✅ task-run (Ns)
```
A spawn finished. Same caveat as `✅ Task completed`.
→ continue.

---

## Self-repair — usually fine, occasionally noisy

```
[seed:<taskId>] 🔧 Attempting to fix gap: seed-script-error:<taskId>:<timestamp>
```
The runner detected a problem with a seed script (e.g. import failed, dir missing) and will rewrite or repair it. Often happens when a sub-template path isn't where expected.
→ continue. Watch for the next event:

```
[self-test] FAIL: var-<name> - Variable '<name>' not found in code
[self-test] FAIL: syntax - Syntax error: <reason>
[seed-script-repair] Self-test failed: <details>
```
The runner's own self-repair test failed. **Often a false alarm** — the rewritten seed script still works in the actual run; the self-test uses generic placeholder vars that don't apply to every script.
→ ignore unless followed by `❌ Seed seeding failed` and the parent task ID doesn't move on the next iteration.

```
⚠️ Context snapshot files missing — creating them now (fallback mode)
```
Recovering from a partial context-snapshot. Self-corrects.
→ continue.

```
⚠️ Seed parent <id> marked complete but has no children — reverting to pending
```
The runner couldn't see children for a seed parent that claims complete. Could be a real orphan, or a tree-visibility issue. The framework rollup logic now distinguishes these — keep watching, but if it repeats for many parents, see `troubleshooting/playbook.md` entry on tree-visibility.
→ continue.

---

## Transients — runner handles, do nothing

```
❌ Skill execution failed [api-error]: API Error: 529 Overloaded.
❌ Error executing skill <name>: API Error: 529 Overloaded.
```
Anthropic / MiniMax / your provider is overloaded. Runner will retry on its own.
→ continue. Don't kill.

```
⚠️ project.yaml not found at <path>
```
Cosmetic warning from a code path that only checks `.yaml`, not `.yml`. Harmless.
→ ignore.

```
Failed to load AI config: ENOENT: no such file or directory, open '<path>/project.yaml'
```
Same cosmetic issue as above, different code path.
→ ignore.

---

## Structural failures — diagnose now

```
❌ Validation failed
   ✗ <taskId>-missing-output-<path>: Task output not created: <path>
   ✗ <taskId>-check-failed-<id>: Check failed: <description>
```
A task ran but its declared `outputs:` aren't on disk OR a check failed. **Common cause:** stale `outputs:` paths after a workflow moved files. See `troubleshooting/playbook.md` entries on stale outputs/inputs.
→ if followed within 2-3 events by `🎬 Starting: <next task>`, it self-recovered. Verify on disk and continue.
→ if it repeats on the same task across attempts, diagnose.

```
❌ Task cannot execute: N blocker(s) still unresolved
  - [<taskId>] Missing required input: <path>
```
A task's `inputs:` aren't satisfied. Either an upstream task didn't produce them, or the input path is wrong.
→ diagnose. See `troubleshooting/playbook.md` entry on stale inputs.

```
❌ Task did not converge
   Task ID: <taskId>
   Unit.run() returned: false
```
The convergence loop gave up. **Often a false alarm** — followed by recovery on the next iteration. But if attempt counter reaches 3 (`maxTaskAttempts`), the run will fail.
→ if next iteration starts a different task, ignore. If same task reappears, diagnose.

```
❌ Gap resolution failed - all strategies exhausted
❌ Seed seeding failed
⚠️ BLOCKING TASK FAILED: <taskId>
```
The runner's auto-repair pipeline gave up. Real structural failure.
→ stop the run. Read FEEDBACK.md / CHECK.md / LEARN.md for the failing task. Apply a fix from `troubleshooting/playbook.md` or surface to the user.

---

## Run-level events — kill / launch / exit

```
⚠️ Max iterations (N) reached. Use --max-iterations to increase.
```
Top-level iteration cap hit. Run exits 0. Did NOT finish.
→ kill if still running, relaunch with `--resume --max-iterations 250` (or higher).

```
⛔ Previous session exited with status: cancelled
   Status:     cancelled
   Ended:      Nm ago
   Progress:   X completed, Y failed (N iterations)
```
Refusal on launch. The previous session was killed (or crashed) without a clean exit.
→ relaunch — resume is automatic. Use `converge retry` to explicitly redo failures. Never use `--full-refresh` mid-project (it wipes finished work).

```
⚠️ Stalled — no progress after fix attempt (N/3).
   Retrying... (attempt N+1)
   📁 Next attempt → attempts/0(N+1)/
```
The auto-repair didn't make progress on this attempt; runner will try again.
→ continue. If attempt 3 fails, the task will be marked failed and the run blocked.

Run process exits with code 0:
- Could mean "playbook complete" (verify with `converge <playbook.yml> list`)
- Could mean "Max iterations reached" (look for that line in tail)

Run process exits non-zero:
- Read the last 30-50 lines of the output file. The trigger is usually visible.
- Common: AI provider outage that exceeded retry budget, disk full, signal kill from outside.

---

## Quick action lookup

| You see... | You do... |
|---|---|
| `Max iterations (N) reached` | kill, relaunch with `--max-iterations 250` |
| `Previous session exited with status: cancelled` on launch | relaunch (resume is automatic) |
| `❌ Validation failed` once, then progress continues | verify on disk, ignore |
| `❌ Validation failed` repeating on same task across 3 attempts | diagnose — load `troubleshooting/playbook.md` |
| `❌ Gap resolution failed - all strategies exhausted` | diagnose now |
| `API Error: 529 Overloaded` | nothing — runner retries |
| `⚠️ project.yaml not found` | nothing — cosmetic |
| `[seed-script-repair] Self-test failed` | nothing IF the parent task moves forward on next iteration |
| Run process exits non-zero | tail output, identify trigger, then act |
