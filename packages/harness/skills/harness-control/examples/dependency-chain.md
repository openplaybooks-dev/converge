# Scenario: Complex Dependency Chain

**Pattern:** Cross-epic dependencies with sequential execution

**Use case:** Multi-stage pipeline where later epics depend on earlier ones.

---

## Epic Structure

```
01-planning/
├── 001-create-project-plan/
│   outputs: ['plan.md']
└── 002-create-work-breakdown/
    inputs: ['plan.md']
    outputs: ['wbs.json']

02-design/
├── 001-wireframes/
│   deps: ['01-planning.002-create-work-breakdown']
│   inputs: ['wbs.json']
│   outputs: ['wireframes/']
└── 002-visual-design/
    deps: ['001-wireframes']
    inputs: ['wireframes/']
    outputs: ['designs/']

03-implementation/
├── 001-setup-project/
│   deps: ['02-design.002-visual-design']
│   inputs: ['designs/']
│   outputs: ['project-scaffold/']
└── 002-build-features/
    deps: ['001-setup-project']
    inputs: ['project-scaffold/']
    outputs: ['src/features/']
```

---

## Execution Order

### Iteration 1: Planning Phase Start

```bash
harness run --step
# Executes: 01-planning/001-create-project-plan
# Creates: plan.md
# Status: ✅ Complete
```

**Why this task ran:**
- No dependencies
- No missing inputs
- First task in queue

---

### Iteration 2: Work Breakdown

```bash
harness run --step
# Executes: 01-planning/002-create-work-breakdown
# Reads: plan.md (from 001)
# Creates: wbs.json
# Status: ✅ Complete
```

**Why this task ran:**
- Depends on 001 (now complete)
- Input `plan.md` exists
- Next in queue

---

### Iteration 3: Design Phase Start

```bash
harness run --step
# Executes: 02-design/001-wireframes
# Depends on: 01-planning.002-create-work-breakdown (complete)
# Reads: wbs.json
# Creates: wireframes/ directory with files
# Status: ✅ Complete
```

**Why this task ran:**
- Cross-epic dependency satisfied (`01-planning.002` complete)
- Input `wbs.json` exists
- Design phase can now begin

---

### Iteration 4: Visual Design

```bash
harness run --step
# Executes: 02-design/002-visual-design
# Depends on: 001-wireframes (complete)
# Reads: wireframes/
# Creates: designs/
# Status: ✅ Complete
```

**Why this task ran:**
- Same-epic dependency satisfied (`001-wireframes` complete)
- Input directory exists
- Design phase completing

---

### Iteration 5: Implementation Phase Start

```bash
harness run --step
# Executes: 03-implementation/001-setup-project
# Depends on: 02-design.002-visual-design (complete)
# Reads: designs/
# Creates: project-scaffold/
# Status: ✅ Complete
```

**Why this task ran:**
- Cross-epic dependency satisfied (`02-design.002` complete)
- All design artifacts ready
- Implementation can begin

---

### Iteration 6: Build Features

```bash
harness run --step
# Executes: 03-implementation/002-build-features
# Depends on: 001-setup-project (complete)
# Reads: project-scaffold/
# Creates: src/features/
# Status: ✅ Complete

# All tasks complete!
```

**Why this task ran:**
- Same-epic dependency satisfied
- Project structure ready
- Final task in pipeline

---

## Key Patterns

### 1. Cross-Epic Dependencies

**Format:** `{epic-id}.{task-id}`

```yaml
# 02-design/tasks/001-wireframes/TASK.md
---
dependencies:
  - 01-planning.002-create-work-breakdown   # Cross-epic dep
---
```

**How it works:**
- Task in epic 02 depends on task in epic 01
- Harness resolves across epic boundaries
- Epic numbering (01-, 02-, 03-) suggests order but doesn't enforce it
- Dependencies are what enforce order

---

### 2. Sequential Execution Enforced by Dependencies

**Linear chain:**
```
A → B → C → D
```

**Implementation:**
```yaml
# Task B
dependencies: [A]

# Task C
dependencies: [B]

# Task D
dependencies: [C]
```

**Guarantee:** Tasks run in order A, B, C, D. No parallelism.

---

### 3. Automatic Dependency Resolution

**Harness automatically:**
1. Scans all TASK.md files
2. Builds dependency graph
3. Determines execution order
4. Runs tasks when dependencies satisfied
5. Blocks tasks until deps complete

**No manual ordering needed:**
- Don't need to run tasks in specific order manually
- Harness figures it out from `dependencies:`
- Can define tasks in any file order

---

### 4. Input/Output Chaining

**Pattern:**
```yaml
# Task A
outputs: [file.txt]

# Task B
dependencies: [A]
inputs: [file.txt]         # Consumes A's output
outputs: [processed.txt]

# Task C
dependencies: [B]
inputs: [processed.txt]    # Consumes B's output
```

**Benefits:**
- Clear data flow
- Explicit contracts
- Easy to trace what depends on what

---

## Implementation

### Epic 01: Planning

```yaml
# 01-planning/tasks/001-create-project-plan/TASK.md
---
title: Create Project Plan
outputs:
  - plan.md
---

Create a project plan in plan.md.
```

```yaml
# 01-planning/tasks/002-create-work-breakdown/TASK.md
---
title: Create Work Breakdown Structure
dependencies:
  - 001-create-project-plan
inputs:
  - plan.md
outputs:
  - wbs.json
---

Read plan.md and create work breakdown in wbs.json.
```

---

### Epic 02: Design

```yaml
# 02-design/tasks/001-wireframes/TASK.md
---
title: Create Wireframes
dependencies:
  - 01-planning.002-create-work-breakdown    # Cross-epic!
inputs:
  - wbs.json
outputs:
  - wireframes/index.html
---

Read wbs.json and create wireframes/.
```

```yaml
# 02-design/tasks/002-visual-design/TASK.md
---
title: Create Visual Designs
dependencies:
  - 001-wireframes                           # Same epic
inputs:
  - wireframes/
outputs:
  - designs/
---

Read wireframes/ and create visual designs/.
```

---

### Epic 03: Implementation

```yaml
# 03-implementation/tasks/001-setup-project/TASK.md
---
title: Setup Project Scaffold
dependencies:
  - 02-design.002-visual-design              # Cross-epic!
inputs:
  - designs/
outputs:
  - project-scaffold/package.json
---

Read designs/ and setup project scaffold.
```

```yaml
# 03-implementation/tasks/002-build-features/TASK.md
---
title: Build Features
dependencies:
  - 001-setup-project                        # Same epic
inputs:
  - project-scaffold/
outputs:
  - src/features/
---

Read scaffold and implement features.
```

---

## Visualizing Dependencies

```bash
harness tree
```

**Output:**
```
01-planning
├── 001-create-project-plan
└── 002-create-work-breakdown
    └── depends on: 001-create-project-plan

02-design
├── 001-wireframes
│   └── depends on: 01-planning.002-create-work-breakdown
└── 002-visual-design
    └── depends on: 001-wireframes

03-implementation
├── 001-setup-project
│   └── depends on: 02-design.002-visual-design
└── 002-build-features
    └── depends on: 001-setup-project
```

---

## Common Issues

### Circular dependency detected

**Error:**
```
Error: Circular dependency detected:
  A → B → C → A
```

**Solution:**
```bash
# Review deps in all tasks
grep -r "dependencies" .harness/epics/*/tasks/*/TASK.md

# Identify the cycle
# Break cycle by removing or reversing one dependency
```

---

### Task never becomes eligible

**Cause:** Dependency never completes (failed or blocked)

**Solution:**
```bash
# Check status of all tasks
harness status

# Find failed dependencies
cat .harness/journal/.checkpoint.json | jq '.failedTasks'

# Fix failed upstream task first
harness reset {upstream-task-id}
harness run --step {upstream-task-id}
```

---

### Wrong execution order

**Cause:** Missing or incorrect dependency declarations

**Solution:**
```bash
# Verify task deps match intended order
grep "dependencies" .harness/epics/{epic}/tasks/{task}/TASK.md

# Add missing dependencies in TASK.md frontmatter
# Same epic: dependencies: [task-id]
# Cross-epic: dependencies: [epic-id.task-id]
```

---

## Variations

### Variation 1: Fan-In (Multiple Dependencies)

```yaml
# Task D depends on A, B, and C
---
dependencies:
  - A
  - B
  - C
inputs:
  - a.txt
  - b.txt
  - c.txt
---
```

**Execution:**
- A, B, C can run in parallel
- D waits until all three complete
- D combines outputs from A, B, C

---

### Variation 2: Optional Dependencies

```yaml
# Task B prefers A's output but can run without it
---
dependencies: []    # No hard dependency
---

# In the prompt body:
If file a.txt exists, use it as input.
Otherwise, generate default configuration.
```

---

## Dependency Best Practices

### 1. Be Explicit

```yaml
# ✅ GOOD: Clear dependency
dependencies:
  - 001-create-plan

# ❌ BAD: Implicit, undeclared
# (task assumes file exists but doesn't declare dep)
```

---

### 2. Use Both dependencies and inputs

```yaml
# ✅ GOOD: Explicit contract
dependencies:
  - 001-task
inputs:
  - output.txt

# ❌ BAD: Only inputs without dependency
inputs:
  - output.txt
```

---

### 3. Avoid Long Chains

```
⚠️ OK but fragile:
A → B → C → D → E → F

✅ BETTER: Break into phases (separate epics)
Phase1: A → B → C
Phase2: D → E → F
(Phase2 depends on Phase1)
```

Long chains mean:
- One failure blocks everything downstream
- Hard to parallelize
- Slow overall execution

---

### 4. Document Cross-Epic Dependencies

```yaml
---
title: Create Wireframes
description: Creates wireframes based on WBS from planning epic
dependencies:
  - 01-planning.002-create-work-breakdown    # Cross-epic
---
```

Use the `description:` field to explain why cross-epic deps exist.

---

## Summary

**When to use this pattern:**
- Multi-stage pipelines (plan → design → implement)
- Clear phases that build on each other
- Need strict ordering guarantees
- Complex dependency graphs

**Key implementation steps:**
1. Plan epic/task hierarchy first
2. Identify dependencies (which tasks need which outputs)
3. Declare `dependencies:` explicitly in TASK.md files
4. Use cross-epic format for dependencies across epics
5. Visualize with `harness tree` to verify

**Benefits:**
- Automatic ordering
- No manual sequencing needed
- Clear dependency contracts
- Resumable at any point
- Easy to understand flow
