# Plan Schema Reference

Complete format specification for all planning artifacts.

---

## File: `.harness/plan.md`

Master plan document. Top-level overview of the entire project plan.

```markdown
# Project Plan

## Overview
[1-3 sentences: what we're building, tech approach, scope]

## Facts
[Known truths — see Facts section below]

## Epic Structure
| Epic | Title | Tasks | Dependencies |
|------|-------|-------|-------------|
| 01-requirements | Gather Requirements | 2 | None |
| 02-foundation | Project Foundation | 3 | 01 |
| 03-data-layer | Data & API | 4 | 02 |

## Epic Flow
[ASCII dependency diagram]

## API Needs
[Internal + External API table — see API Needs section below]

## WBS Summary
| Task | Data Source | Pattern | Spawns |
|------|-----------|---------|--------|
| 04.003 | screens.json | 1 per screen | ~8 |

## Skills Used
| Skill | Used By | Purpose |
|-------|---------|---------|
| ux-design | 01.001 | Generate UX spec |

## Risk Register
| Risk | Impact | Mitigation |
|------|--------|------------|
| [description] | High/Med/Low | [mitigation] |
```

---

## File: `EPIC.md`

Epic metadata. One per epic directory.

**Location:** `.harness/epics/{NN-epic-name}/EPIC.md`

```yaml
---
id: 02-foundation
title: Foundation
description: Set up project structure, design system, and core configuration
---

# Foundation

This epic establishes the foundational elements:
1. Project scaffolding and configuration
2. Design system generation
3. Design token implementation
```

### EPIC.md Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Epic identifier: `NN-kebab-case` |
| `title` | Yes | Human-readable title |
| `description` | Yes | One-line purpose |

### Body Content
- Brief overview of what the epic accomplishes
- Numbered list of tasks (for human reference)
- No execution instructions (those go in TASK.md)

---

## File: `TASK.md`

Task definition. One per task directory.

**Location:** `.harness/epics/{NN-epic}/{NNN-task}/TASK.md`

```yaml
---
id: 001-task-name
title: Human-Readable Title
description: What this task accomplishes in one sentence
dependencies:
  - upstream-task-id
  - 01-epic.002-cross-epic-dep
inputs:
  - path/to/input.md
  - src/**/*.tsx
outputs:
  - path/to/output.md
  - src/generated/file.ts
skills:
  - skill-name
tags:
  - category
  - phase
blocking: true
executor:
  type: ai
  prompt: |
    Inline prompt (alternative to body instructions)
wbs:
  type: nodejs
  path: ./wbs.js
checks:
  - id: check-identifier
    cmd: shell-command-returns-0
    description: Human-readable check description
allowed-tools:
  - Read
  - Write
  - Bash
---

# Task Title

[Step-by-step instructions for the AI executor]

## Step 1: ...
...

## Step 2: ...
...

## Success Criteria
- [What must be true when done]
```

### TASK.md Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | Yes | string | Unique within epic: `NNN-kebab-case` |
| `title` | Yes | string | Human-readable title |
| `description` | Recommended | string | One-line purpose |
| `outputs` | Yes | string[] | File paths this task creates |
| `checks` | Yes | Check[] | Validation commands |
| `dependencies` | If needed | string[] | Task IDs that must complete first |
| `inputs` | If needed | string[] | File paths/globs this task reads |
| `skills` | If needed | string[] | Harness skills to invoke |
| `tags` | Optional | string[] | Categorization labels |
| `blocking` | Optional | boolean | If true, blocks all downstream |
| `executor` | Optional | object | Execution method override |
| `wbs` | Optional | object | Work Breakdown Structure config |
| `allowed-tools` | Optional | string[] | Restrict available tools |

### Dependency Formats

```yaml
# Same-epic
dependencies:
  - 001-upstream-task

# Cross-epic
dependencies:
  - 01-requirements.002-spec

# Tag-based
dependencies:
  - tag:setup

# Mixed
dependencies:
  - 001-setup
  - 01-requirements.002-spec
  - tag:foundation
```

### Executor Types

```yaml
# Skill-based (default — uses skills: field)
skills:
  - ux-design

# AI-based (inline prompt)
executor:
  type: ai
  prompt: |
    Create the config file with these settings...

# WBS-based (dynamic subtask spawning)
wbs:
  type: nodejs
  path: ./wbs.js
```

---

## Check Schema

```yaml
checks:
  - id: string          # Unique check ID (kebab-case)
    cmd: string          # Shell command (exit 0 = pass, non-zero = fail)
    description: string  # Human-readable description
```

### Check Severity Conventions

Use emoji prefixes in description to indicate severity:

```yaml
checks:
  - id: critical-file
    cmd: test -f core.ts
    description: "\U0001F534 CRITICAL - core.ts must exist"

  - id: required-section
    cmd: grep -q "## API" spec.md
    description: "\U0001F7E1 REQUIRED - spec.md has API section"

  - id: optional-docs
    cmd: test -f CHANGELOG.md
    description: "\u26AA OPTIONAL - CHANGELOG.md exists"
```

### Common Check Patterns

```yaml
# File existence
- id: exists
  cmd: test -f output.md
  description: Output file exists

# Non-empty file
- id: nonempty
  cmd: test -s output.md
  description: Output file is not empty

# JSON validity
- id: valid-json
  cmd: jq empty data.json
  description: Valid JSON format

# YAML validity
- id: valid-yaml
  cmd: python3 -c "import yaml; yaml.safe_load(open('config.yaml'))"
  description: Valid YAML format

# Has required section
- id: has-overview
  cmd: grep -q "## Overview" output.md
  description: Has Overview section

# TypeScript compiles
- id: compiles
  cmd: npx tsc --noEmit
  description: TypeScript compiles

# Tests pass
- id: tests-pass
  cmd: npm test -- --passWithNoTests
  description: All tests passing

# File count
- id: screens-generated
  cmd: test $(ls screens/*.html 2>/dev/null | wc -l) -ge 3
  description: At least 3 screen files generated

# Content validation
- id: has-entities
  cmd: grep -cE "^## " data-models.md | awk '{if($1>=3) exit 0; exit 1}'
  description: At least 3 entity definitions
```

---

## Facts Schema

Facts are documented in `.harness/plan.md` under the `## Facts` section.

### Format

```markdown
## Facts

### Tech Facts
- FACT: [statement] — Source: [where learned]

### Data Facts
- FACT: [statement] — Source: [where learned]

### Constraint Facts
- FACT: [statement] — Source: [where learned]

### Business Facts
- FACT: [statement] — Source: [where learned]
```

### Fact Rules
- **Specific:** "Uses React 19" not "Uses React"
- **Measurable:** "Max 100 concurrent users" not "Should handle users"
- **Sourced:** Always note where the fact came from
- **Stable:** Facts don't change during execution (if they do, update plan.md)

### Fact Categories

| Category | Examples |
|----------|---------|
| **Tech** | Framework, language, runtime versions |
| **Data** | Database type, schema structure, relationships |
| **Constraint** | Deadlines, budget, platform targets |
| **Business** | User expectations, pricing model, scale |
| **Security** | Auth method, data sensitivity, compliance |
| **Integration** | External APIs, third-party services |

---

## API Needs Schema

Documented in `.harness/plan.md` under `## API Needs`.

### Internal APIs

```markdown
### Internal APIs (to build)
| Endpoint | Method | Purpose | Request | Response | Task |
|----------|--------|---------|---------|----------|------|
| `/api/users` | GET | List users | `?page=1&limit=20` | `User[]` | 03.001 |
| `/api/users/:id` | GET | Get user | - | `User` | 03.001 |
| `/api/users` | POST | Create user | `{name, email}` | `User` | 03.002 |
```

### External APIs

```markdown
### External APIs (to integrate)
| Service | Purpose | Auth | Endpoints Used | Config |
|---------|---------|------|---------------|--------|
| Stripe | Payments | API Key | charges, subscriptions | STRIPE_SECRET_KEY |
| Auth0 | Auth | OAuth2 | /authorize, /token | AUTH0_DOMAIN |
```

---

## WBS Script Schema (`wbs.js`)

```javascript
import { readFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  // ctx.projectDir — project root path
  // ctx.spawn(task, opts) — spawn a subtask

  const data = JSON.parse(
    readFileSync(join(ctx.projectDir, 'data.json'), 'utf-8')
  );

  for (const [index, item] of data.entries()) {
    await ctx.spawn({
      id: `NNN-${String(index + 1).padStart(3, '0')}-${item.id}`,
      title: `Process ${item.name}`,
      dependencies: [],
      inputs: [`source/${item.id}.json`],
      outputs: [`output/${item.id}.txt`],
      skills: [],
      tags: [],
      vars: { itemId: item.id, itemName: item.name },
      checks: [{
        id: 'exists',
        cmd: `test -f output/${item.id}.txt`,
        description: `${item.name} output exists`
      }],
      body: `Instructions for processing ${item.name}.`,
    });
  }
}
```

### WBS Context API

| Property/Method | Description |
|----------------|-------------|
| `ctx.projectDir` | Absolute path to project root |
| `ctx.spawn(task, opts)` | Spawn a subtask |
| `ctx.log(message)` | Write to execution log |
| `ctx.data` | Shared data between WBS calls |

### Spawn Task Shape

```typescript
{
  id: string;              // Required: subtask ID
  title?: string;          // Display name
  dependencies?: string[]; // Task IDs
  inputs?: string[];       // Input file paths
  outputs?: string[];      // Output file paths
  skills?: string[];       // Skill references
  tags?: string[];         // Tags
  vars?: Record<string, string>;  // Template variables
  checks?: Check[];        // Validation checks
  body?: string;           // Markdown instructions
  plan?: string;           // Execution plan
}
```

---

## Directory Naming Conventions

```
Epics:    NN-kebab-case    → 01-requirements, 02-foundation
Tasks:    NNN-kebab-case   → 001-gather-needs, 002-create-spec
Subtasks: NNN-NNN-kebab    → 003-001-screen-dashboard
```

- Epics: Two-digit prefix (01-99)
- Tasks: Three-digit prefix (001-999)
- Subtasks: Parent prefix + three-digit suffix
- Always kebab-case after the number
- Sort order matches execution order (when sequential)
