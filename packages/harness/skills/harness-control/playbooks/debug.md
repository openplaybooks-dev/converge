# Debugging Failed Tasks

## CRITICAL PROTOCOL
1. **READ** `attempts/wip/LEARN.md` FIRST (AI's own failure analysis)
2. **READ** `attempts/wip/log.log` (what actually happened)
3. **READ** `TASK.md` (what was supposed to happen)
4. **TEST** checks manually (verify they work)
5. **FIX** root cause (not symptoms)
6. **RESET** and retry

**DO NOT propose fixes without reading LEARN.md** — you're wasting iterations.

---

## Red Flags — STOP What You're Doing

- **Proposing a fix without reading LEARN.md** — Your prior analysis is right there. Read it.
- **Retrying the exact same task without changing anything** — Same input = same output.
- **Editing output files manually instead of fixing the task** — Next run will overwrite your edits.
- **Resetting and retrying 3+ times** — This is a loop. Fix the root cause.
- **Skipping check verification** — Run the check manually BEFORE claiming it's broken.

| Excuse | Reality |
|--------|---------|
| "I'll just reset and retry" | If you didn't change anything, the result will be identical. |
| "The check must be wrong" | Run it manually first. 80% of the time the output is wrong, not the check. |
| "I need to rewrite the entire task" | Most failures are path mismatches or check syntax. Start small. |
| "It works on my machine" | Harness runs checks from project root. Check your working directory. |
| "The task is too complex to debug" | Use binary search — add intermediate checks to isolate the failure point. |

---

## Failure Diagnostic Table

| Symptom | Root Cause (90% of cases) | Instant Fix | Verification |
|---------|---------------------------|-------------|--------------|
| "Task not found" | File path wrong | `find .harness/epics -name "TASK.md"` | Check path matches `{epic}/{task}/TASK.md` |
| "Output missing" | Path mismatch OR task didn't create it | `ls -la {output-path}` + check TASK.md `outputs:` | Paths must match exactly |
| "Check failed" | Check command syntax wrong OR working dir wrong | `cd projectRoot && {check-cmd}` | Exit code 0 = pass |
| "Infinite loop" | Check ALWAYS fails OR output NEVER created | Test check manually, verify output path | Fix check or output path |
| "Blocked by deps" | Upstream task incomplete/failed | `harness tree \| grep {taskId}` | Fix upstream first |
| "Skill invocation failed" | Skill doesn't exist OR outputs not created | `ls .harness/skills/{name}/SKILL.md` | Verify skill outputs |
| "Nothing runs" | All complete OR all blocked OR all failed | `harness status` + `harness tree` | Check checkpoint.json |

---

## Fast Diagnosis Commands

```bash
# 1. What failed?
harness status --failed

# 2. Why did it fail? (READ THIS)
cat .harness/journal/epics/{epic}/tasks/{task}/attempts/wip/LEARN.md

# 3. What was the actual error?
cat .harness/journal/epics/{epic}/tasks/{task}/attempts/wip/log.log | tail -50

# 4. Which check failed?
cat .harness/journal/epics/{epic}/tasks/{task}/attempts/wip/CHECK.result.md

# 5. What was the task trying to do?
cat .harness/epics/{epic}/{task}/TASK.md
```

---

## Problem-Solving Patterns

### Pattern 1: Output File Not Created

**Fast Check:**
```bash
# Expected output path from TASK.md
expected="path/to/output.txt"

# What files were actually created?
find . -name "$(basename $expected)" -type f -mmin -10  # Files created in last 10 min

# If found at wrong path → fix TASK.md outputs:
# If not found at all → task code didn't create it
```

**Common Causes:**
- Task created file at relative path, but `outputs:` has absolute path
- Task code has bug and never creates file
- File created then deleted by cleanup code
- Wrong working directory during execution

**Fix Template:**
```yaml
# ❌ BAD: relative vs absolute mismatch
outputs:
  - output.txt            # task creates ./subdir/output.txt
checks:
  - id: exists
    cmd: test -f output.txt  # checks ./output.txt

# ✅ GOOD: consistent paths
outputs:
  - .stitch/output.txt
checks:
  - id: exists
    cmd: test -f .stitch/output.txt
```

---

### Pattern 2: Check Command Fails (But File Exists)

**Fast Test:**
```bash
# Copy exact check command from TASK.md
check_cmd="test -f .stitch/output.txt"

# Run from project root (where harness runs it)
cd /absolute/path/to/project
$check_cmd && echo "✅ PASS" || echo "❌ FAIL (exit code: $?)"

# If fails but file exists → check command is wrong
# If passes manually but fails in harness → working dir issue
```

**Common Causes:**
- Check uses relative path, but working dir is different than expected
- Check command has shell syntax error (unescaped quotes, etc.)
- Check command requires tool that's not installed (jq, curl, etc.)
- Check command too strict (exact match instead of pattern match)

**Fix Examples:**
```yaml
# ❌ BAD: assumes working dir
checks:
  - id: exists
    cmd: test -f output.txt

# ✅ GOOD: explicit path from project root
checks:
  - id: exists
    cmd: test -f .stitch/output.txt

# ❌ BAD: too strict
checks:
  - id: exact-match
    cmd: diff output.txt expected.txt     # Fails on any difference

# ✅ GOOD: semantic validation
checks:
  - id: has-status
    cmd: grep -q "status.*success" output.txt
```

---

### Pattern 3: Infinite Retry Loop

**Diagnosis:**
```bash
# Compare LEARN.md across attempts
diff .harness/journal/epics/{epic}/tasks/{task}/attempts/01/LEARN.md \
     .harness/journal/epics/{epic}/tasks/{task}/attempts/wip/LEARN.md

# If identical → task isn't learning, problem is structural
# If different → task is trying different approaches
```

**Root Causes (Ranked):**
1. **Check command always fails** (80%) - Test manually to verify
2. **Output never created** (15%) - File path mismatch
3. **Task definition impossible** (5%) - Requires manual intervention

**Fix Protocol:**
```bash
# 1. Test check manually
cd projectRoot && {check-cmd} && echo PASS || echo FAIL

# 2. If check passes manually but fails in harness:
#    → Working directory issue
#    → Add absolute path to check

# 3. If check fails manually:
#    → Check command is wrong
#    → Fix check command in TASK.md

# 4. If file doesn't exist:
#    → Task code never creates it
#    → Add debug logging to task prompt
```

---

### Pattern 4: Missing Input (Blocker)

**Fast Resolution:**
```bash
# Which task creates this input?
grep -r "\.outputs.*{input-file}" .harness/epics/*/*/TASK.md

# Is that task complete?
cat .harness/journal/.checkpoint.json | jq '.completedTasks' | grep {upstream-task}

# If not complete → run upstream first
harness run --step {upstream-epic}/{upstream-task}

# If upstream failed → debug that task first
```

**Dependency Chain Debugging:**
```bash
# Visualize full dependency tree
harness tree

# Find what's blocking a task
harness tree | grep -A5 {taskId}

# Find root tasks (no dependencies)
grep -L "dependencies" .harness/epics/*/tasks/*/TASK.md
```

---

### Pattern 5: WBS Task Not Running

**Diagnosis:**
```bash
# Did WBS function execute?
grep "Spawning subtask" .harness/journal/epics/{epic}/tasks/{parent}/attempts/wip/log.log

# If yes → check if children were created
find .harness/epics/{epic}/{parent} -name "TASK.md" -type f

# If no children → WBS function has error
# If children exist but don't run → check their dependencies
```

**Common WBS Issues:**
- Data file for WBS doesn't exist (check .inputs([...]))
- WBS function has syntax error (check log.log for stacktrace)
- Child task IDs have invalid format (must be {parent-id}-{child-id})
- Child tasks have unmet dependencies

---

## Debugging Techniques

### Technique 1: Binary Search for Failure Point

Add checks incrementally in TASK.md to isolate failure:
```yaml
checks:
  - id: step1
    cmd: test -f intermediate1.txt    # Add this first
  - id: step2
    cmd: test -f intermediate2.txt    # Then this
  - id: step3
    cmd: test -f final.txt
# First failing check = where task breaks
```

### Technique 2: Manual Task Execution

```bash
# Copy prompt from TASK.md
cat .harness/journal/epics/{epic}/tasks/{task}/attempts/wip/TASK.md

# Execute manually line by line
# Watch for errors in real-time
# Identify exact failing command
```

### Technique 3: Diff Successful vs Failed Attempts

```bash
# If task succeeded before and fails now
diff .harness/journal/epics/{epic}/tasks/{task}/attempts/01/TASK.md \
     .harness/journal/epics/{epic}/tasks/{task}/attempts/wip/TASK.md

# Shows what changed between attempts
```

### Technique 4: Trace File Creation

```bash
# Monitor file creation in real-time
watch -n 1 "find .stitch -type f -mmin -1"  # Files modified in last minute

# Run task in another terminal
harness run --step {taskId}

# See which files are actually being created
```

---

## Resolution Strategies (Ranked by Speed)

### Strategy 1: Fix Check Command (30 seconds)
**When:** Check fails but file exists
```bash
# Test check manually → identify issue → update TASK.md
vim .harness/epics/{epic}/{task}/TASK.md  # Fix .checks([...])
harness reset {taskId} && harness run --step
```

### Strategy 2: Fix Output Path (1 minute)
**When:** File created at wrong location
```bash
# Update .outputs([...]) to match actual file location
vim .harness/epics/{epic}/{task}/TASK.md
harness reset {taskId} --outputs  # Clean old outputs
harness run --step
```

### Strategy 3: Add Debug Logging (2 minutes)
**When:** Task fails silently, no clear error

Add to the TASK.md prompt body:
```markdown
DEBUG: After each major step, create a debug.log file showing:
- What you just did
- What files you created
- Any errors encountered

This helps diagnose failures.
```

### Strategy 4: Reset and Retry (5 seconds)
**When:** Transient failure (network, race condition)
```bash
harness reset {taskId} && harness run --step
```

### Strategy 5: Nuclear Reset (10 seconds)
**When:** Checkpoint is corrupted or inconsistent
```bash
rm .harness/journal/.checkpoint.json
find .harness/journal/epics -name "wip" -type d -exec rm -rf {} + 2>/dev/null
harness run --step  # Start completely fresh
```

---

## Emergency Diagnostics (When Nothing Works)

```bash
# 1. Verify harness can find tasks
find .harness/epics -name "TASK.md" -type f | wc -l  # Should show N tasks

# 2. Verify checkpoint is readable
cat .harness/journal/.checkpoint.json | jq .  # Should show valid JSON

# 3. Verify task definition is valid TypeScript
cd .harness/epics/{epic}/{task}
node -c TASK.md  # Check for syntax errors

# 4. Check file permissions
ls -la .harness/journal/  # Should be writable

# 5. Check disk space
df -h .  # Need space for outputs
```

---

## Common Anti-Patterns (Learn from Mistakes)

### Anti-Pattern 1: Ignoring LEARN.md
❌ **Wrong:** Propose fix immediately without reading failure analysis
✅ **Right:** Read LEARN.md → understand root cause → fix cause not symptom

### Anti-Pattern 2: Testing Checks from Wrong Directory
❌ **Wrong:** `cd task-dir && test -f output.txt`
✅ **Right:** `cd project-root && test -f task-dir/output.txt`

### Anti-Pattern 3: Vague Check Commands
❌ **Wrong:** `cmd: cat output.txt` — always passes if file exists
✅ **Right:** `cmd: grep -q "SUCCESS" output.txt` — validates content

### Anti-Pattern 4: Resetting Without Understanding
❌ **Wrong:** `harness reset` → run again → fails again
✅ **Right:** Read logs → identify issue → fix → then reset

---

## Success Criteria Checklist

After fixing a failed task:

- [ ] Manual test of check commands passes: `cd projectRoot && {check} && echo OK`
- [ ] Output files exist at paths specified in `outputs:`
- [ ] LEARN.md in previous attempt explains what was wrong
- [ ] Fix addresses root cause, not just symptoms
- [ ] Task runs successfully: `harness run --step {taskId}` completes
- [ ] Subsequent dependent tasks can now run

---

## Summary: Debugging Protocol

1. **Read** LEARN.md (AI's own analysis)
2. **Test** checks manually (verify they work)
3. **Identify** root cause (not symptoms)
4. **Fix** TASK.md or code
5. **Reset** task
6. **Verify** fix works
7. **Document** in commit what you fixed

**Remember:** Every failure has a file with the explanation. Read before guessing.
