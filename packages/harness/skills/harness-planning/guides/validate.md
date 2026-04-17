# Phase 4: Validate the Plan

## Mission

Verify the plan is complete, consistent, and executable before handing off to `harness-control`. Fix issues found.

**Inputs:**
- `.harness/plan.md`
- `.harness/epics/` (all EPIC.md and TASK.md files)
- `.harness/requirements.md`

**Output:** Validated plan approved by user.

---

## Validation Checklist

Run through each check. Fix issues before proceeding.

### 4.1: Structural Completeness

```bash
# Every epic has EPIC.md
for dir in .harness/epics/*/; do
  test -f "$dir/EPIC.md" || echo "MISSING: $dir/EPIC.md"
done

# Every task has TASK.md
for dir in .harness/epics/*/*/; do
  test -f "$dir/TASK.md" || echo "MISSING: $dir/TASK.md"
done

# WBS tasks have wbs.js
grep -rl "wbs:" .harness/epics/*/*/TASK.md | while read f; do
  dir=$(dirname "$f")
  test -f "$dir/wbs.js" || echo "MISSING: $dir/wbs.js (referenced in TASK.md)"
done
```

**Check:**
- [ ] Every epic directory has `EPIC.md`
- [ ] Every task directory has `TASK.md`
- [ ] WBS references have corresponding `wbs.js` files
- [ ] Numbering is sequential (01-, 02-... for epics; 001-, 002-... for tasks)

---

### 4.2: Task Quality

For each TASK.md, verify frontmatter:

| Field | Required | Check |
|-------|----------|-------|
| `id` | Yes | Unique across epic, matches directory name |
| `title` | Yes | Human-readable, descriptive |
| `outputs` | Yes | At least one specific file path |
| `checks` | Yes | At least one check per output |
| `description` | Recommended | Clear purpose statement |
| `dependencies` | If needed | Valid task IDs, no cycles |
| `inputs` | If needed | Files that actually exist or are produced upstream |
| `skills` | If needed | Skill name matches available skills |

**Common issues:**
```yaml
# BAD: No outputs
outputs: []

# BAD: Vague outputs
outputs: ['output/*']

# BAD: No checks
checks: []

# BAD: Check doesn't match output
outputs: ['data.json']
checks:
  - id: exists
    cmd: test -f data.txt     # Wrong file!

# GOOD: Outputs with matching checks
outputs: ['data.json']
checks:
  - id: exists
    cmd: test -f data.json
    description: data.json exists
  - id: valid
    cmd: jq empty data.json
    description: Valid JSON
```

---

### 4.3: Dependency Integrity

```bash
# Collect all task IDs
find .harness/epics -name "TASK.md" -exec grep -h "^id:" {} \; | sed 's/id: //' > /tmp/task-ids.txt

# Check all dependency references resolve
find .harness/epics -name "TASK.md" -exec grep -h "dependencies:" -A 20 {} \; | grep "^ *- " | sed 's/^ *- //' | while read dep; do
  # Same-epic deps
  grep -q "^$dep$" /tmp/task-ids.txt || echo "BROKEN DEP: $dep"
done
```

**Check:**
- [ ] All dependency references point to existing tasks
- [ ] No circular dependencies
- [ ] Cross-epic deps use `epic-id.task-id` format
- [ ] Input files are produced by upstream task outputs

---

### 4.4: Input/Output Chain

Trace the data flow through epics:

```
Epic 01 outputs → Epic 02 inputs (do they match?)
Epic 02 outputs → Epic 03 inputs (do they match?)
...
```

**Check:**
- [ ] Every input file is produced by a prior task's output
- [ ] No orphan outputs (files produced but never consumed — acceptable but flag)
- [ ] No missing inputs (files consumed but never produced — error)

---

### 4.5: Facts Verification

Review `.harness/plan.md` facts section:

- [ ] At least 5 facts documented
- [ ] Facts are specific and measurable (not "app should be fast")
- [ ] Tech facts match analysis.md findings
- [ ] Constraint facts match requirements.md
- [ ] No contradictory facts

---

### 4.6: Requirements Coverage

Cross-reference requirements with epics:

```markdown
| Requirement | Covered By | Status |
|-------------|-----------|--------|
| User auth   | 02.001    | ✅ Covered |
| Dashboard   | 04.002    | ✅ Covered |
| API for X   | 03.003    | ✅ Covered |
| Mobile support | ???    | ❌ NOT COVERED |
```

**Check:**
- [ ] Every "must have" requirement maps to at least one task
- [ ] Every "should have" requirement is either mapped or explicitly deferred
- [ ] Deferred items are documented in plan.md

---

### 4.7: Plan Summary for User

Present the validated plan to the user:

```markdown
## Plan Summary

**Epics:** [N] epics with [M] total tasks
**Estimated steps:** [X] sequential, [Y] parallelizable
**WBS tasks:** [Z] tasks will spawn subtasks dynamically

### Epic Overview
1. **01-requirements** — [description] — [N tasks]
2. **02-foundation** — [description] — [N tasks]
3. ...

### Key Decisions
- [Decision 1]: [rationale]
- [Decision 2]: [rationale]

### Facts ([N] total)
- [Top 3 most important facts]

### Risks
- [Risk 1]: [mitigation]

### Open Questions
- [Any unresolved questions for user]
```

**Ask user:** "Does this plan look correct? Any changes needed before we start execution?"

---

## Fixing Common Issues

### Missing Outputs
```yaml
# Before: No outputs
---
id: 001-analyze
title: Analyze Requirements
---

# After: Explicit outputs
---
id: 001-analyze
title: Analyze Requirements
outputs:
  - requirements.md
checks:
  - id: exists
    cmd: test -f requirements.md
    description: requirements.md created
---
```

### Circular Dependency
```
Task A deps: [B]
Task B deps: [A]   ← CYCLE

Fix: Split B into B1 (no deps) and B2 (deps: [A])
Then: A deps: [B1], B2 deps: [A]
```

### Too Many Tasks in Epic
```
Epic 03 has 12 tasks  ← Too many

Fix: Split into 03a (6 tasks) and 03b (6 tasks)
```

### Missing Checks
```yaml
# Add at minimum:
checks:
  - id: output-exists
    cmd: test -f ${output_file}
    description: Output file created
  - id: output-nonempty
    cmd: test -s ${output_file}
    description: Output file is not empty
```

---

## Success Criteria

- [ ] All structural checks pass (4.1)
- [ ] All tasks have outputs and checks (4.2)
- [ ] All dependencies resolve, no cycles (4.3)
- [ ] Input/output chains are complete (4.4)
- [ ] Facts are documented and verified (4.5)
- [ ] All requirements are covered or explicitly deferred (4.6)
- [ ] User has reviewed and approved the plan (4.7)

---

## Handoff to Execution

Once validated and approved:

```bash
# Initialize harness (if not already)
harness init

# Verify structure
harness tree
harness verify

# Begin execution
harness run --step    # Step-by-step
harness run           # Autonomous

# See: harness-control skill for execution guidance
```

**The plan is now ready for `harness-control` to execute.**
