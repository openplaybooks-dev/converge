# Phase 4: Validate the Plan

## Mission

Verify the plan is complete, consistent, and executable before handing off to `converge-control`. Fix issues found.

**Inputs:**
- `playbook.yml`
- `.converge/playbooks/{name}/tasks/` (all TASK.md files)
- `.converge/requirements.md`

**Output:** Validated plan approved by user.

---

## Validation Checklist

Run through each check. Fix issues before proceeding.

### 4.1: Structural Completeness

```bash
# Every task directory has TASK.md (at all nesting levels)
find .converge/playbooks/*/tasks -type d | while read dir; do
  # Skip the root tasks/ dir itself
  [ "$dir" = ".converge/playbooks/*/tasks" ] && continue
  [ -f "$dir/TASK.md" ] || echo "MISSING: $dir/TASK.md"
done

# playbook.yml exists
test -f .converge/playbooks/*/playbook.yml || echo "MISSING: playbook.yml"

# WBS tasks have wbs/index.js
grep -rl "wbs:" .converge/playbooks/*/tasks/*/TASK.md .converge/playbooks/*/tasks/*/*/TASK.md 2>/dev/null | while read f; do
  dir=$(dirname "$f")
  test -f "$dir/wbs/index.js" || echo "MISSING: $dir/wbs/index.js (referenced in TASK.md)"
done
```

**Check:**
- [ ] Every task directory has `TASK.md` (at all nesting levels)
- [ ] `playbook.yml` exists
- [ ] WBS references have corresponding `wbs/index.js` files
- [ ] Numbering is sequential within each level

---

### 4.2: Task Quality

For each TASK.md, verify frontmatter:

| Field | Required | Check |
|-------|----------|-------|
| `id` | Yes | Unique among siblings, matches directory name |
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
find .converge/playbooks/*/tasks -name "TASK.md" -exec grep -h "^id:" {} \; | sed 's/id: //' > /tmp/task-ids.txt

# Check all dependency references resolve
find .converge/playbooks/*/tasks -name "TASK.md" -exec grep -h "dependencies:" -A 20 {} \; | grep "^ *- " | sed 's/^ *- //' | while read dep; do
  # Sibling or cross-branch deps
  grep -q "^$dep$" /tmp/task-ids.txt || echo "BROKEN DEP: $dep"
done
```

**Check:**
- [ ] All dependency references point to existing tasks
- [ ] No circular dependencies
- [ ] Cross-branch deps use dotted path format (e.g. `01-requirements.002-spec`)
- [ ] Input files are produced by upstream task outputs

---

### 4.4: Context Flow Integrity (Context Interpolation)

Trace the context flow through the task hierarchy. Every task's `inputs` (Context In) must be produced by an upstream task's `outputs` (Context Out). This is the context chain — see `preferences/context-principles.md` (Principle 2).

```
Task 01 outputs → Task 02 inputs (do they match?)
Task 02 outputs → Task 03 inputs (do they match?)
...
```

**Check:**
- [ ] Every input file is produced by a prior task's output (no orphan inputs)
- [ ] No orphan outputs (files produced but never consumed — acceptable but flag)
- [ ] No missing inputs (files consumed but never produced — error)
- [ ] No over-broad inputs (e.g., `src/**/*` when only one file is needed)

---

### 4.5: Facts Verification

Review facts in playbook description and task TASK.md bodies:

- [ ] At least 5 facts documented
- [ ] Facts are specific and measurable (not "app should be fast")
- [ ] Tech facts match analysis.md findings
- [ ] Constraint facts match requirements.md
- [ ] No contradictory facts

---

### 4.6: Requirements Coverage

Cross-reference requirements with tasks:

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
- [ ] Deferred items are documented in `playbook.yml` or task structure

---

### 4.7: Plan Summary for User

Present the validated plan to the user:

```markdown
## Plan Summary

**Tasks:** [N] top-level, [M] total across all levels
**Estimated steps:** [X] sequential, [Y] parallelizable
**WBS tasks:** [Z] tasks will spawn children dynamically

### Task Overview
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

### Too Many Children
```
Task 03 has 12 children  ← Too many

Fix: Split into 03a (6 children) and 03b (6 children)
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
# Initialize converge (if not already)
converge init

# Verify structure
converge tree
converge verify

# Begin execution
converge run --step    # Step-by-step
converge run           # Autonomous

# See: converge-control skill for execution guidance
```

**The plan is now ready for `converge-control` to execute.**
