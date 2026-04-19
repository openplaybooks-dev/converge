# Generate New Playbook from Prompt

## Mission

Transform a user's prompt into a complete, runnable converge playbook with tasks, dependencies, checks, and WBS.

**Inputs:**
- User prompt (what to build)
- Playbook name (derived from prompt or `--name`)
- Project directory (scanned for context)

**Outputs:**
- `.converge/playbooks/{name}/playbook.yml`
- `.converge/playbooks/{name}/tasks/` (task hierarchy)

---

## Mode Selection

Before starting, assess the prompt complexity to choose a mode.

### Standard Mode (Scan + Architect)

**Use when:** The prompt is specific and actionable.

Examples:
- "Build a todo app with React and Supabase"
- "Create a REST API for inventory management"
- "Add a dashboard page with charts"

**Phases:** Scan project → Architect plan → Write files → Verify

### Deep Mode (All 4 Phases)

**Use when:** The prompt is vague, exploratory, or the project is complex.

Examples:
- "Help me plan my project"
- "I have an idea for a SaaS product"
- "Organize this codebase into a proper plan"

**Phases:** Scan project → Discover needs → Architect plan → Write files → Verify

### Decision Rule

```
IF prompt contains specific tech choices, feature list, or clear scope
  → Standard mode

IF prompt is vague, asks for "help", or describes a high-level idea
  → Deep mode
```

---

## Phase 1: Scan the Project

Understand what exists before planning.

```bash
# Package manager & runtime
ls package.json requirements.txt pyproject.toml go.mod Cargo.toml 2>/dev/null

# Framework detection (Node.js)
cat package.json 2>/dev/null | jq -r '.dependencies // {} | keys[]' 2>/dev/null | head -20

# Directory overview
find . -maxdepth 2 -type d -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' 2>/dev/null | sort

# Build/test status
npm run build 2>&1 | tail -5
npm test 2>&1 | tail -5

# Existing converge or playbooks
ls -la .converge/ 2>/dev/null
ls -la .converge/playbooks/ 2>/dev/null
```

**Capture findings mentally** — tech stack, file structure, current state, existing patterns. You'll use these when designing the plan.

---

## Phase 2: Discover Needs (Deep Mode Only)

If in deep mode, ask the user clarifying questions:

1. **Vision** — What is this project? What problem does it solve?
2. **Core features** — What are the 3-5 most important features? Rank them.
3. **User flows** — Walk through the main user journey.
4. **Data & APIs** — What data does this work with? External services?
5. **Constraints** — Hard requirements, deadlines, technology constraints?

Capture answers as facts for the plan.

---

## Phase 3: Architect the Plan

### Step 3.1: Choose a Project Pattern

Based on prompt + scan, select the closest pattern:

**Full-Stack App:**
```
01-foundation        # Setup, config, design system
02-data-layer        # Models, types, API routes
03-ui-screens        # Pages and components
04-behavior          # State, interactivity
05-integration       # Wire UI to API
06-polish            # Tests, performance, deploy
```

**API Project:**
```
01-foundation        # Setup, database schema
02-core-endpoints    # Primary CRUD
03-business-logic    # Complex rules
04-auth              # Authentication & authorization
05-testing           # Integration & load tests
```

**CLI Tool:**
```
01-foundation        # Setup, arg parsing
02-core-commands     # Main commands
03-io                # Input/output handling
04-testing           # Unit & integration tests
```

Adapt as needed — these are starting points.

### Step 3.2: Define Top-Level Tasks (3-7)

Each top-level task:
- Has a clear deliverable
- Contains 2-5 children
- Uses 2-digit prefix: `01-name`, `02-name`
- Can nest children arbitrarily deep

### Step 3.3: Define Children

Each child task uses the same TASK.md schema:
- **id** — 3-digit prefix: `001-name`
- **title** — Human-readable
- **description** — What it accomplishes
- **dependencies** — Upstream task IDs (sibling or cross-branch `task-id.child-id`)
- **inputs** — Files/data consumed
- **outputs** — Files produced
- **checks** — Shell commands that return 0 on success
- **skills** — Converge skills if applicable

### Step 3.4: Design Checks

Every task MUST have checks. Layer from basic to semantic:

```yaml
checks:
  # Layer 1: File exists
  - id: file-exists
    cmd: test -f output.ts
    description: Output file created

  # Layer 2: Non-empty
  - id: file-nonempty
    cmd: test -s output.ts
    description: Output file is not empty

  # Layer 3: Compiles (for code)
  - id: compiles
    cmd: npx tsc --noEmit
    description: TypeScript compiles

  # Layer 4: Tests pass (if applicable)
  - id: tests-pass
    cmd: npm test -- --passWithNoTests
    description: Tests passing
```

### Step 3.5: Identify WBS Candidates

Use WBS when a task spawns N similar children from data:
- Generate N pages from a list → WBS
- Process each entity in a data model → WBS
- Create one config file → No WBS

### Step 3.6: Map Dependencies

- **Sibling:** Use task ID only: `001-setup`
- **Cross-branch:** Use dotted path: `01-foundation.002-config`
- **No circular deps** — If you find a cycle, split the task
- **Minimize deps** — Only depend on what you actually consume

---

## Phase 4: Write the Playbook Files

### Directory Structure

```
.converge/playbooks/{name}/
├── playbook.yml
└── tasks/
    ├── 01-<task>/
    │   ├── TASK.md
    │   ├── 001-<child>/
    │   │   └── TASK.md
    │   └── 002-<child>/
    │       └── TASK.md
    ├── 02-<task>/
    │   ├── TASK.md
    │   └── ...
    └── ...
```

### playbook.yml Format

```yaml
name: {name}
description: <one line from prompt>

run:
  mode: autonomous
  maxIterations: 50
  maxTaskAttempts: 3
  resume: true
```

### TASK.md Format (for each task)

```yaml
---
id: 001-task-name
title: Human-Readable Title
description: What this task accomplishes
dependencies:
  - upstream-task-id
inputs:
  - path/to/input
outputs:
  - path/to/output
checks:
  - id: check-id
    cmd: shell-command-returns-0
    description: What this validates
---

# Task Title

[Clear, step-by-step instructions for the AI executor]
```

### Rules

- Every task MUST have `outputs` and `checks`
- Every output file must have at least one check (file exists + non-empty)
- Dependencies must reference valid task IDs — no circular deps
- Task IDs use 3-digit prefix: `001-name`, `002-name`
- Top-level task IDs use 2-digit prefix: `01-name`, `02-name`
- Task bodies should have concrete instructions, not vague descriptions
- For code tasks, include a compilation check
- Keep tasks focused: one task, one purpose

---

## Phase 5: Verify

After writing all files:

1. Confirm `playbook.yml` exists and is valid YAML
2. Confirm each top-level task has a TASK.md and at least one child
3. Confirm no broken dependency references
4. Confirm every task has outputs and checks
5. Print summary: number of tasks and how to run

---

## Success Criteria

- `playbook.yml` exists with name, description, and run config
- Task directory structure is valid (tasks with children)
- Every task has: id, title, outputs, checks
- Dependencies are explicit and acyclic
- At least 2 top-level tasks with at least 2 children each
