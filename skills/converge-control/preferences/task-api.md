# TASK.md Reference

**Purpose:** Understand TASK.md file format when debugging or inspecting tasks.

**When to use:** Reading task definitions during debugging, understanding what a task expects.

**To create tasks:** Use the **`converge-planning`** skill instead.

---

## Basic Structure

Tasks are declared as TASK.md files with YAML frontmatter + markdown body. The frontmatter defines metadata, the markdown body becomes the AI prompt.

```markdown
---
id: 001-task-name
title: Human-readable Title
description: What this task does
outputs:
  - output.txt
checks:
  - id: check-id
    description: Output file created
    cmd: test -f output.txt
---

# Task Instructions

The markdown body is the prompt sent to the AI agent.
Write detailed instructions here.
```

### File Location

```
.converge/epics/{epic-id}/tasks/{task-id}/TASK.md
```

Task ID is derived from the folder name. The `id` field in frontmatter is optional (overrides folder name if set).

---

## Frontmatter Fields

### Identity

#### `id` **[Optional]**

Task identifier. Derived from folder name if omitted.

```yaml
id: 001-create-plan
```

**Format:** Numbers + kebab-case, leading zeros for sorting.

---

#### `title` **[Optional]**

Human-readable title. Defaults to `id` if not set.

```yaml
title: Create Project Plan
```

---

#### `description` **[Optional]**

Short description of what the task does.

```yaml
description: Analyzes requirements and creates project plan
```

---

### File Contracts

#### `inputs` **[Optional]**

Files or glob patterns this task reads. Missing inputs create blocker gaps.

```yaml
inputs:
  - .stitch/UX.md
  - .stitch/DESIGN.md
  - src/**/*.ts
```

---

#### `outputs` **[Recommended]**

Files this task must create. Missing outputs = task incomplete.

```yaml
outputs:
  - src/design-tokens.ts
  - tailwind.config.ts
```

Paths are relative to project root. Glob patterns supported.

---

### Dependencies

#### `dependencies` **[Optional]**

Tasks that must complete before this one runs.

**Same-epic:**
```yaml
dependencies:
  - 001-create-plan
  - 002-generate-config
```

**Cross-epic:**
```yaml
dependencies:
  - 01-planning.002-breakdown
  - 02-design.001-wireframes
```

**Tag-based (all tasks with tag must complete):**
```yaml
dependencies:
  - tag:setup
  - tag:design
```

**Mixed:**
```yaml
dependencies:
  - 001-setup-db
  - tag:design
```

---

#### `blocking` **[Optional]**

Whether this task blocks dependents on failure. Default: `true`.

```yaml
blocking: true    # Dependents blocked if this fails
blocking: false   # Optional task — dependents run regardless
```

---

### Execution

#### Markdown Body (Prompt)

The markdown content below the frontmatter is the AI prompt. Write clear, specific instructions.

```markdown
---
id: 001-create-plan
outputs:
  - plan.md
---

# Create Project Plan

Read the requirements from requirements.md and create a project plan.

Include:
- Project goals
- Timeline estimate
- Required resources
- Success criteria

Output: plan.md
```

**Variable interpolation** in the body:
- `{vars.KEY}` — Custom variable from `vars` field
- `{epicId}` — Current epic ID
- `{taskId}` — Current task ID
- `{projectDir}` — Project root directory

---

#### `skills` **[Optional]**

Skills to attach to the task for the AI to use.

```yaml
skills:
  - ux-design
  - stitch-generate
```

---

#### `agent` **[Optional]**

AI agent to use for this task. Overrides default.

```yaml
agent: frontend-specialist
```

---

#### `executor` **[Optional]**

Executor type and configuration.

**AI executor (default):**
```yaml
executor:
  type: ai
  agent: claude-opus
```

**Skill executor:**
```yaml
executor:
  type: skill
  skill: stitch-generate
```

**Script executor:**
```yaml
executor:
  type: script
  script:
    type: bash
    path: ./run.sh
    args: [--verbose]
    env:
      NODE_ENV: production
```

---

### Validation

#### `checks` **[Recommended]**

Shell commands to verify task completion. Exit code 0 = pass.

```yaml
checks:
  - id: file-exists
    description: Output file created
    cmd: test -f output.txt

  - id: file-nonempty
    description: Output not empty
    cmd: test -s output.txt

  - id: valid-json
    description: Valid JSON format
    cmd: jq empty output.json

  - id: has-sections
    description: Has required sections
    cmd: grep -q "## Overview" output.md && grep -q "## Details" output.md
```

**Best practices:**
- Layer checks: existence → non-empty → valid content
- Use semantic validation, not exact string matching
- Keep checks deterministic
- All commands run from project root

---

### Variables

#### `vars` **[Optional]**

Task-scoped variables, accessible in the prompt via `{vars.KEY}`.

```yaml
vars:
  screenId: home-screen
  componentName: HomePage
  format: html
```

**Non-reserved keys** in frontmatter automatically become vars too:

```yaml
screenId: home-screen       # Becomes {vars.screenId}
componentName: HomePage     # Becomes {vars.componentName}
```

---

### Organization

#### `tags` **[Optional]**

Tags for filtering and tag-based dependencies.

```yaml
tags:
  - design-system
  - priority:high
  - phase:foundation
```

---

#### `milestone` **[Optional]**

Milestone ID for selective execution. When `runtime.milestone` is set in PROJECT.md, only matching tasks run.

```yaml
milestone: html-design
```

---

### Context & Materials

#### `materials` **[Optional]**

Reference external files as context for the AI.

```yaml
materials:
  - .stitch/DESIGN.md
  - docs/api.md
  - src/types/index.ts
```

---

#### `context` **[Optional]**

Structured context gathering.

```yaml
context:
  - type: file
    path: .stitch/UX.md
    label: UX Overview
  - type: files
    pattern: src/pages/**/*.tsx
    label: Existing pages
    maxFiles: 10
```

---

#### `allowed-tools` **[Optional]**

Restrict which tools the AI can use.

```yaml
allowed-tools:
  - Bash
  - Read
  - Write
```

---

### Advanced

#### `wbs` **[Optional]**

Work Breakdown Structure — a script that spawns child tasks dynamically.

```yaml
wbs:
  type: nodejs          # or 'shell'
  path: ./wbs.js        # relative to task directory
```

See `preferences/wbs-reference.md` for the full wbs.js script contract.

---

#### `plan` **[Optional]**

Enable planning phase before execution.

```yaml
plan:
  prompt: Analyze the requirements and create implementation plan
  output: .converge/plan.md
```

---

#### `auto-converge` **[Optional]**

Enable auto-correction loop.

```yaml
auto-converge: true
```

Or with config:
```yaml
auto-converge:
  mode: ai
```

---

#### `correction-budget` **[Optional]**

Max auto-correction attempts.

```yaml
correction-budget: 3
```

---

#### `diagnosis-hints` **[Optional]**

Hints for error diagnosis.

```yaml
diagnosis-hints:
  - pattern: "Module not found"
    hint: Install dependencies first
    severity: error
    suggestedFix: npm install
```

---

## EPIC.md

Epics use the same format as TASK.md but are placed at:

```
.converge/epics/{epic-id}/EPIC.md
```

```yaml
---
id: 02-ux-design
title: UX Design & Screen Generation
description: Create UX spec and generate screens
---

# UX Design & Screen Generation

Epic-level description of goals and scope.
```

---

## Complete Examples

### Simple Task

```markdown
---
title: Create Mock Data
blocking: true
dependencies:
  - 002-create-types
tags:
  - mock-data
outputs:
  - src/data/mockData.ts
checks:
  - id: file-exists
    cmd: test -f src/data/mockData.ts
  - id: file-size
    cmd: test $(wc -l < src/data/mockData.ts) -gt 200
    description: File has sufficient content
---

# Create Mock Data

Create comprehensive mock data for development and testing.

Read the data model:

```bash
cat .converge/epics/05-add-behavior/001-analyze-data-models/data-models.md
```

Generate `src/data/mockData.ts` with realistic test data for all entities.
```

### Task with Skills & Variables

```markdown
---
title: Implement LessonNode Store
skills:
  - react-zustand-patterns
tags:
  - zustand
  - store
inputs:
  - src/types/models.ts
  - src/data/mockData.ts
outputs:
  - src/stores/lessonNodeStore.ts
checks:
  - id: file-exists
    cmd: test -f src/stores/lessonNodeStore.ts
  - id: has-zustand
    cmd: grep -q "from 'zustand'" src/stores/lessonNodeStore.ts
vars:
  entityName: LessonNode
  storeFile: lessonNodeStore.ts
---

# Implement {vars.entityName} Store

Create `src/stores/{vars.storeFile}` using Zustand.

Use the **/react-zustand-patterns** skill for store conventions.
```

### Task with Design System Checks

```markdown
---
title: Implement Design Tokens
description: Generate design system tokens from DESIGN.md
blocking: true
dependencies:
  - 002-generate-design-system
tags:
  - setup
  - design-system
  - tailwind
inputs:
  - .stitch/DESIGN.md
outputs:
  - src/design-tokens.ts
  - tailwind.config.ts
checks:
  - id: design-tokens-exist
    cmd: test -f src/design-tokens.ts
  - id: tailwind-config-updated
    cmd: grep -q "canvasPearl" tailwind.config.ts
  - id: typescript-compiles
    cmd: npx tsc --noEmit src/design-tokens.ts
---

# Implement Design Tokens

Read `.stitch/DESIGN.md` and extract the design system into code.

Create:
1. `src/design-tokens.ts` — TypeScript constants for colors, spacing, typography
2. Update `tailwind.config.ts` — Add semantic color names to Tailwind theme
```

---

## Frontmatter Field Summary

| Field | Required | Purpose |
|-------|----------|---------|
| `id` | ⬜ | Task identifier (defaults to folder name) |
| `title` | ⬜ | Human-readable title |
| `description` | ⬜ | Short description |
| `inputs` | ⬜ | Input files/patterns |
| `outputs` | ✅ | Output files |
| `dependencies` | ⬜ | Task dependencies (IDs or tags) |
| `blocking` | ⬜ | Block dependents on failure (default: true) |
| `skills` | ⬜ | Skills to attach |
| `agent` | ⬜ | AI agent override |
| `executor` | ⬜ | Executor type & config |
| `checks` | ⬜ | Validation commands |
| `vars` | ⬜ | Task-scoped variables |
| `tags` | ⬜ | Tags for filtering |
| `milestone` | ⬜ | Milestone ID |
| `materials` | ⬜ | Context files |
| `context` | ⬜ | Structured context gathering |
| `allowed-tools` | ⬜ | Restrict AI tools |
| `wbs` | ⬜ | Work Breakdown Structure script |
| `plan` | ⬜ | Planning phase config |
| `auto-converge` | ⬜ | Auto-correction loop |
| `correction-budget` | ⬜ | Max correction attempts |
| `diagnosis-hints` | ⬜ | Error diagnosis hints |

---

## Best Practices

### Layer Checks
```yaml
# ✅ GOOD: Incremental validation
checks:
  - id: exists
    cmd: test -f output.txt
  - id: nonempty
    cmd: test -s output.txt
  - id: valid-content
    cmd: grep -q "## Overview" output.txt

# ❌ BAD: Only checking existence
checks:
  - id: exists
    cmd: test -f output.txt
```

### Be Explicit with Dependencies
```yaml
# ✅ GOOD: Clear dependency
dependencies:
  - 001-create-plan

# ❌ BAD: Implicit (task assumes file exists but no declared dep)
inputs:
  - plan.md
# Missing dependencies!
```

### Use Both dependencies and inputs
```yaml
# ✅ GOOD: Explicit contract
dependencies:
  - 001-create-plan
inputs:
  - plan.md

# ❌ BAD: Only inputs without dependency
inputs:
  - plan.md
```

---

## See Also

- `preferences/cli-reference.md` — CLI commands
- `preferences/wbs-reference.md` — WBS script contract
- `examples/screen-generation.md` — WBS pattern
- `examples/data-modeling.md` — Retry pattern
- `examples/dependency-chain.md` — Cross-epic dependencies
