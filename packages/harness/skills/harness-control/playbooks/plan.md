# Planning Epics & Tasks

> **For comprehensive upfront planning** (fresh project, full analysis + discovery + plan creation), use the **`harness-planning`** skill instead. This playbook covers the mechanics of creating individual epics and tasks within an existing plan.

## RULES
- Use convention: 01-, 02- (epics) / 001-, 002- (tasks)
- DO NOT create tasks without `outputs:` in frontmatter
- DO define `dependencies:` explicitly

---

## Steps to Plan Epic

1. Break goal into numbered tasks (001-, 002-)
2. Define outputs for each task
3. Set dependencies (cross-epic: 'epic-id.task-id')
4. Create TASK.md files
5. Run: `harness run`

---

## Numbering Conventions

### Epics
```
01-planning
02-design
03-implementation
04-testing
05-deployment
```
Format: Two digits (01-, 02-) + kebab-case name

### Tasks
```
001-create-plan
002-analyze-requirements
003-generate-spec
```
Format: Three digits (001-, 002-) + kebab-case name, unique within epic

### Subtasks
```
003-generate-screens/
├── TASK.md (parent WBS)
├── 003-001-screen-dashboard/
├── 003-002-screen-profile/
└── 003-003-screen-settings/
```
Format: parent-id + dash + subtask number (003-001-, 003-002-)

---

## Task Template

```yaml
# .harness/epics/{epic}/tasks/001-create-ux/TASK.md
---
title: Create UX Specification
description: Define user flows, screens, and interactions
dependencies:
  - 01-planning.002-requirements
inputs:
  - requirements/spec.md
outputs:
  - .stitch/UX.md
  - .stitch/screens-plan.json
checks:
  - id: ux-exists
    cmd: test -f .stitch/UX.md
---

# Create UX Specification

[Prompt instructions here...]
```

---

## Dependencies

### Same-Epic
```yaml
dependencies:
  - 001-upstream
```

### Cross-Epic
```yaml
dependencies:
  - 01-planning.002-task    # epic-id.task-id
```

### No Dependencies
```yaml
dependencies: []   # Can run anytime
```

---

## Breaking Circular Dependencies

### Detection
```bash
harness verify
# Output: Error: Circular dependency: 01-planning.001 → 02-data.002 → 01-planning.001
```

### Resolution Strategies

#### 1. Remove Unnecessary Dependency
If `01-planning.001` doesn't actually need `02-data.002` output:
```yaml
# Before (circular) — 01-planning/tasks/001-task/TASK.md
dependencies:
  - 02-data.002   # ❌ Creates cycle

# After (fixed)
dependencies: []   # ✅ Remove if not needed
```

#### 2. Split Task to Break Cycle
Break `02-data.002` into two tasks where only one depends on `01-planning.001`:
```yaml
# 02-data/tasks/002a-fetch/TASK.md — no deps, can run first
dependencies: []

# 02-data/tasks/002b-process/TASK.md — depends on planning
dependencies:
  - 01-planning.001
  - 002a-fetch       # ✅ No cycle

# 01-planning/tasks/001-task/TASK.md
dependencies:
  - 02-data.002a-fetch  # ✅ Only depends on fetch, not process
```

#### 3. Move to Same Epic
If tasks are tightly coupled, they belong in the same epic:
```yaml
# Before: 01-planning.001 ↔ 02-data.002 (circular cross-epic)

# After: same epic, sequential
# 01-planning/tasks/001-fetch-data/TASK.md
dependencies: []

# 01-planning/tasks/002-analyze-data/TASK.md
dependencies:
  - 001-fetch-data    # ✅ Same-epic dependency is clearer
```

### Example: Real-World Fix
```yaml
# Scenario: Planning needs data, but data needs planning output

# ❌ BROKEN: Circular
# 01-planning/tasks/001-create-plan/TASK.md → depends on 02-data.001-fetch-data
# 02-data/tasks/001-fetch-data/TASK.md → depends on 01-planning.001-create-plan
# CYCLE!

# ✅ FIXED: Split data task
# 02-data/tasks/001-fetch-raw-data/TASK.md (no deps, just fetch)
---
dependencies: []
outputs:
  - data/raw.json
---

# 01-planning/tasks/001-create-plan/TASK.md (uses raw data)
---
dependencies:
  - 02-data.001-fetch-raw-data
inputs:
  - data/raw.json
outputs:
  - plan.md
---

# 02-data/tasks/002-process-data/TASK.md (uses plan)
---
dependencies:
  - 01-planning.001-create-plan
inputs:
  - plan.md
  - data/raw.json
outputs:
  - data/processed.json
---
```

### Verification
```bash
# After fixing
harness verify
# Output: ✅ No circular dependencies detected

harness tree
# Should show clear dependency flow without cycles
```

---

## Planning Workflows

### Linear Flow
Sequential dependencies, each step builds on previous.

```
01-planning
  └─ 001-define-goals → 002-create-roadmap

02-design
  └─ 001-wireframes → 002-mockups → 003-prototypes
```

**Dependencies:**
```yaml
# 002-create-roadmap/TASK.md
dependencies:
  - 001-define-goals              # 002 depends on 001

# 02-design/tasks/001-wireframes/TASK.md
dependencies:
  - 01-planning.002-create-roadmap  # cross-epic
```

---

### Parallel Flow
Tasks independent, no dependencies.

```
03-implementation
  ├─ 001-api (independent)
  ├─ 002-frontend (independent)
  └─ 003-database (independent)
```

**No cross-dependencies:**
```yaml
dependencies: []   # All can run in parallel
```

---

### Fan-Out Flow
Create one TASK.md per subtask in a `tasks/` subdirectory:

```
003-generate-screens/
  ├─ TASK.md (parent)
  └─ tasks/
      ├─ 003-001-dashboard/TASK.md
      ├─ 003-002-profile/TASK.md
      ├─ 003-003-settings/TASK.md
      └─ 003-004-billing/TASK.md
```

See examples/screen-generation.md for complete details.

---

### Fan-In Flow
Multiple tasks feed into one.

```
Tasks A, B, C → Task D (combines results)
```

**Implementation:**
```yaml
# Task D
dependencies:
  - A
  - B
  - C
inputs:
  - a.txt
  - b.txt
  - c.txt
```

---

## Planning Checklist

### Before Creating Tasks
- [ ] Define clear end goals
- [ ] Identify required artifacts (outputs)
- [ ] List prerequisites (inputs)
- [ ] Map dependencies
- [ ] Choose epic structure
- [ ] Plan numbering scheme

### For Each Task
- [ ] Clear, unique ID
- [ ] Specific outputs defined
- [ ] Dependencies declared
- [ ] Validation checks designed
- [ ] Prompt instructions written
- [ ] Inputs identified

### After Planning
- [ ] Visualize with `harness tree`
- [ ] Check for circular deps with `harness verify`
- [ ] Verify numbering consistency
- [ ] Review dependency chain

---

## Planning Tools

```bash
harness tree                # See task tree
harness verify              # Check for issues
harness tree 02-design      # View specific epic
harness run --step --dry    # Preview execution order
```

---

## Anti-Patterns

### ❌ Too Many Dependencies
```yaml
dependencies: [001, 002, 003, 004, 005]  # Over-constrained
```
**Problem:** Prevents parallelism
**Better:** Only depend on what you actually need

### ❌ Circular Dependencies
```yaml
# Task A depends on C, B depends on A, C depends on B → cycle!
```
**Problem:** Impossible to execute
**Fix:** Break the cycle

### ❌ Monolithic Tasks
```yaml
outputs: [file1.txt, file2.txt, file3.txt, file4.txt, ...]
```
**Problem:** Hard to debug, can't parallelize
**Better:** Break into smaller tasks

### ❌ No Validation Checks
```yaml
outputs:
  - output.txt
checks: []   # Empty!
```
**Problem:** Can't detect failures
**Better:** Add existence and quality checks

### ❌ Vague Outputs
```yaml
outputs:
  - output/*   # What files exactly?
```
**Problem:** Hard to verify, unclear contract
**Better:** Specific file paths

---

## Example: Screen Generation Project

### Goals
Generate mobile app UI screens

### Artifacts
- UX specification
- Design system
- Screen mockups (HTML)

### Phases
1. Requirements - Gather user needs
2. UX Design - Define flows and screens
3. Design System - Create visual language
4. Screen Generation - Create mockups

### Epic Structure
```
01-requirements/
  ├─ 001-analyze-idea
  └─ 002-list-features

02-ux-design/
  ├─ 001-create-ux-spec (deps: 01.002)
  └─ 002-define-screens

03-design-system/
  └─ 001-generate-design-system (deps: 02.001)

04-screen-generation/
  ├─ 001-create-prompts (deps: 02.002, 03.001)
  └─ 002-generate-screens (WBS, deps: 001)
```

### Dependency Flow
```
01.001 → 01.002
       → 02.001 → 02.002
               → 03.001
                       → 04.001 → 04.002
```

See examples/screen-generation.md for complete implementation.

---

## Summary

**Good planning:**
- Clear goals and artifacts
- Logical epic grouping
- Appropriate granularity
- Explicit dependencies
- Realistic validation

**Plan for:**
- Sequential execution (deps)
- Parallel execution (no deps)
- Dynamic generation (WBS/yields)
- Iterative refinement (loops)

**Validate with:**
- `harness tree`
- `harness verify`
- `harness run --step --dry`
