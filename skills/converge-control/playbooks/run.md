# Running Tasks

## Red Flags — STOP Before Running

- **Running tasks with unmet dependencies** — Check `converge tree` first.
- **Retrying without reading LEARN.md** — Prior failure analysis exists. Use it.
- **Running `converge run` when status shows blockers** — Fix blockers first with `converge status`.
- **Claiming "task not found" without reading TASK.md** — Verify the file path.

| Excuse | Reality |
|--------|---------|
| "I'll just run everything and see what happens" | Blocked tasks waste iterations. Fix blockers first. |
| "The task probably works now" | Check `converge run --step --dry` to preview before executing. |
| "I'll fix failures after all tasks run" | Downstream tasks depend on upstream. Fix in order. |

## Rules
- DO NOT skip reading TASK.md before claiming "not found"
- DO NOT run tasks with unmet dependencies
- DO read TASK.md in journal/attempts/wip/ for current attempt context

---

## Steps to Run

1. Check status: `converge status`
2. Run next: `converge run --step`
3. Verify output: Check files listed in `outputs:`
4. If failed: See playbooks/debug.md

---

## Commands

### Run Everything (Autonomous)
```bash
converge run
```
Scans .converge/epics/, detects gaps, executes tasks, retries failures with LEARN.md, continues until complete or max iterations.

### Run One Task (Step Mode)
```bash
converge run --step
```
Executes next eligible task, stops after one, shows what ran, exits.

### Preview What Runs
```bash
converge run --step --dry
```
Shows which task would run next, displays details, does NOT execute.

### Run Specific Epic
```bash
converge run 02-design
```
Runs all tasks in epic, respects dependencies, skips other epics.

### Run Specific Task
```bash
converge run 02-design/001-create-ux
```
Runs only that task, checks dependencies first, fails if dependencies not met.

---

## Common Options

```bash
converge run --verbose              # Detailed logs
converge run --max-iterations=50    # Limit iterations (default: 100)
converge run --max-attempts=5       # Per-task retries (default: 2)
```

---

## Execution Order

Determined by:
1. Dependencies: Tasks with `dependencies:` wait
2. Inputs: Tasks with missing `inputs:` blocked
3. Completion: Already completed tasks skipped
4. Failures: Failed tasks may retry or stay blocked

### Example

```
.converge/epics/
├── 01-planning/
│   ├── 001-create-plan     # No deps, runs first
│   └── 002-breakdown       # Depends on 001
└── 02-design/
    └── 001-wireframes      # Depends on 01.002
```

**Order:** 01/001 → 01/002 → 02/001

---

## Troubleshooting

### Task Not Running
**Check:** `converge status` and `converge tree`

**Common causes:**
- Dependencies not met
- Already completed
- Failed and locked
- Not discovered (wrong path)

**Fix:**
```bash
converge reset {taskId}           # Unlock failed task
converge tree | grep {taskId}     # Check dependencies
```

### Infinite Loop
**Symptom:** Same task runs repeatedly

**Check:** Read LEARN.md for root cause

**Common causes:**
- Checks always fail
- Outputs not created correctly
- Check command wrong

**Fix:** Read LEARN.md, fix task definition, reset and retry

### Nothing Runs
**Check:** `converge verify` and `converge status`

**Common causes:**
- All tasks complete
- All tasks blocked by dependencies
- Circular dependencies

**Fix:** `converge tree` to see what's blocking

---

## Patterns

### Development Loop
```bash
vim .converge/epics/02-design/001-task/TASK.md  # Edit
converge run --step --dry                        # Preview
converge run --step                              # Run one
converge status                                  # Check result
```

### Epic-by-Epic
```bash
converge run 01-planning
converge status
converge run 02-design
converge status
```

### Retry Failed Tasks
```bash
converge status --failed          # Find failures
converge reset 003-task           # Reset specific
converge run --step 003-task      # Run it
```

---

## Output Examples

### Successful Run
```
[converge] Running: 01-planning/003-create-spec
[converge] ✓ Task complete
```

### Failed Run
```
[converge] ✗ Check failed: file-exists
[converge] Writing LEARN.md
[converge] Task failed (attempt 1/2)
```
**Action:** Load playbooks/debug.md

### Blocked Task
```
[converge] Task blocked
[converge] Missing dependency: 02-design.003-mockups
```
**Action:** Run dependency first

---

## Summary

- **Run everything:** `converge run`
- **Run one task:** `converge run --step`
- **Preview:** `converge run --step --dry`
- **Run specific:** `converge run {epic}/{task}`

Converge is gap-driven: runs what needs to run based on missing outputs and failed checks.
