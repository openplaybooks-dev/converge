# Plan Schema Reference

Complete format specification for all planning artifacts.

---

## File: `playbook.yml`

Playbook manifest. Defines the task list, dependencies, run config, and top-level checks.

**Location:** `.converge/playbooks/{name}/playbook.yml`

```yaml
name: default
description: |
  End-to-end app generation.

  ## Facts
  - FACT: Uses React 19 + TypeScript 5.4
  - FACT: Tailwind CSS with custom design tokens

  ## API Needs
  - Internal: /api/users (GET, POST)
  - External: Stripe for payments

run:
  mode: autonomous
  maxIterations: 50
  maxTaskAttempts: 3

tasks:
  - id: 01-prepare-requirements
  - id: 02-design-system
    depends_on: [01-prepare-requirements]
  - id: 03-build-screens
    depends_on: [02-design-system]

checks:
  - id: type-check
    cmd: npx tsc --noEmit
  - id: tests-pass
    cmd: npm test -- --passWithNoTests
```

---

## File: `TASK.md`

Task definition. One per task directory. The same schema applies at every nesting level — a top-level task and a deeply nested child use identical TASK.md format. Tasks nest arbitrarily deep.

**Location:** `.converge/playbooks/{name}/tasks/{path-to-task}/TASK.md`

**Example: Task with children (any level)**
```yaml
---
id: 01-prepare-requirements
title: Prepare Requirements
description: Validate app idea, generate PRD, generate UX spec, extract screen definitions
blocking: true
dependencies: []
outputs:
  - PRD.md
  - .stitch/UX.md
  - .stitch/screens.json
checks:
  - id: ux-spec-exists
    cmd: test -f .stitch/UX.md
    description: UX specification exists
references:
  - ux-design
---

# Prepare Requirements

Gathers requirements and produces foundational artifacts:
1. Validate app idea
2. Generate PRD
3. Generate UX overview
4. Breakdown UX to screens
```

**Example: Leaf task (any level)**
```yaml
---
id: 001-task-name
title: Human-Readable Title
description: What this task accomplishes in one sentence
dependencies:
  - upstream-task-id
  - 01-requirements.002-spec       # Cross-branch dep (dotted path)
inputs:
  - path/to/input.md
outputs:
  - path/to/output.md
skills:
  - skill-name
checks:
  - id: check-identifier
    cmd: shell-command-returns-0
    description: Human-readable check description
---

# Task Title

[Step-by-step instructions for the AI executor]

## Step 1: ...
...

## Success Criteria
- [What must be true when done]
```

### TASK.md Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | Yes | string | Unique among siblings: `NN-kebab-case` or `NNN-kebab-case` |
| `title` | Yes | string | Human-readable title |
| `description` | Recommended | string | One-line purpose |
| `outputs` | Yes | string[] | Context Out: file paths this task produces for downstream consumption |
| `checks` | Yes | Check[] | Validation commands |
| `dependencies` | If needed | string[] | Task IDs that must complete first |
| `inputs` | If needed | string[] | Context In: file paths/globs this task reads from upstream (context contract) |
| `skills` | If needed | string[] | Converge skills to invoke |
| `references` | Optional | string[] | Skill libraries to reference |
| `vars` | Optional | object | Template variables (passed to WBS/children) |
| `plan` | Optional | string | Execution plan hint |
| `backlogs` | Optional | Backlog[] | Non-blocking quality issues to track |
| `tags` | Optional | string[] | Categorization labels |
| `blocking` | Optional | boolean | If true, blocks all downstream |
| `executor` | Optional | object | Execution method override |
| `wbs` | Optional | object | Work Breakdown Structure config |
| `allowed-tools` | Optional | string[] | Restrict available tools |

### Dependency Formats

```yaml
# Sibling (same level)
dependencies:
  - 001-upstream-task

# Cross-branch (dotted path)
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

# WBS-based (dynamic child spawning)
wbs:
  type: nodejs
  path: ./wbs/index.js
```

### Context Contract

Every task's `inputs` and `outputs` form a **context contract** — an explicit declaration of what context flows in and out. See `preferences/context-principles.md` (Principle 2) for the full reference.

**Rules:**
- Every `input` must be an upstream task's `output` (no orphan inputs)
- Every `output` should be consumed by a downstream task's `input` (flag orphans)
- Use specific paths, not broad globs — narrow inputs make task boundaries clear

**Example: Context flow through a screen build pipeline**

```yaml
# 001-spec
outputs: [screen-spec.md]

# 002-design (reads spec, produces design)
inputs:  [screen-spec.md]
outputs: [design.html]

# 003-convert (reads design, produces component)
inputs:  [design.html]
outputs: [src/screens/Home.tsx]

# 004-split (reads component, produces sub-components)
inputs:  [src/screens/Home.tsx]
outputs: [src/components/Header.tsx, src/components/Footer.tsx]
```

Each task reads exactly what the prior task produced. The chain is traceable from first input to final output.

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

Facts can live in the playbook `description` field, any TASK.md body, or `data/facts.json` in the journal.

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
- **Stable:** Facts don't change during execution (if they do, update the playbook or task)

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

Documented in task TASK.md bodies or the playbook `description` field.

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

## WBS API

WBS spawns N child tasks dynamically. Two patterns: from JSON data, or from AI analysis.

### ctx API

| Property/Method | Description |
|----------------|-------------|
| `ctx.projectDir` | Absolute path to project root |
| `ctx.spawn(task)` | Spawn a child task |
| `ctx.ai.askJson(prompt, schema)` | Ask AI to analyze and return structured JSON |
| `ctx.log(message)` | Write to execution log |

### ctx.spawn(task) Shape

```typescript
{
  id: string;              // Required: NNN-kebab-case
  title?: string;          // Display name
  dependencies?: string[]; // Task IDs
  inputs?: string[];       // Input file paths
  outputs?: string[];      // Output file paths
  skills?: string[];       // Skill references
  tags?: string[];         // Tags
  vars?: Record<string, string>;  // Template variables
  checks?: Check[];        // Validation checks
  body?: string;           // Markdown instructions
}
```

### Pattern 1: WBS from JSON

Read a data file, spawn one task per item.

```js
import { readFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const items = JSON.parse(
    readFileSync(join(ctx.projectDir, 'data.json'), 'utf-8')
  );

  for (const [i, item] of items.entries()) {
    await ctx.spawn({
      id: `${String(i + 1).padStart(3, '0')}-${item.id}`,
      title: item.name,
      dependencies: [],             // parallel — use [prevId] for sequential
      outputs: [`output/${item.id}.json`],
      checks: [{ id: 'exists', cmd: `test -f output/${item.id}.json`, description: `${item.name} exists` }],
      body: `Process ${item.name}.\n\n${JSON.stringify(item, null, 2)}`,
    });
  }
}
```

### Pattern 2: WBS from AI analysis

Use `ctx.ai.askJson()` when the task list isn't in a file — AI must analyze code/data to decide what to spawn.

```js
import { z } from 'zod';

export async function run(ctx) {
  const items = await ctx.ai.askJson(
    'Scan src/api/ and list all route handlers that lack tests.',
    z.array(z.object({
      path: z.string(),
      name: z.string(),
    }))
  );

  for (const [i, item] of items.entries()) {
    await ctx.spawn({
      id: `${String(i + 1).padStart(3, '0')}-test-${item.name}`,
      title: `Write tests for ${item.name}`,
      inputs: [item.path],
      outputs: [`${item.path.replace('.ts', '.test.ts')}`],
      checks: [{ id: 'tests', cmd: `npx vitest run ${item.path.replace('.ts', '.test.ts')}`, description: 'Tests pass' }],
      body: `Write unit tests for ${item.path}.`,
    });
  }
}
```

### Rules

- Always `export async function run(ctx)` — ESM only
- Every `ctx.spawn()` must have a unique `id` (NNN-kebab-case)
- Every spawn must have at least one `check`
- Use `dependencies: []` for parallel, `dependencies: [prevId]` for sequential
- Use `ctx.ai.askJson()` only when data isn't in a file — it's slower

---

## Directory Naming Conventions

All task directories live under `.converge/playbooks/{name}/tasks/`.

```
Top-level:  NN-kebab-case    → 01-requirements, 02-foundation
Children:   NNN-kebab-case   → 001-gather-needs, 002-create-spec
WBS-spawned: NNN-NNN-kebab   → 003-001-screen-dashboard
```

- Top-level tasks: Two-digit prefix (01-99)
- Children: Three-digit prefix (001-999)
- WBS-spawned: Task prefix + three-digit suffix
- Always kebab-case after the number
- Sort order matches execution order (when sequential)
- WBS scripts go in `wbs/index.js` within the task directory
- WBS-spawned children go in `tasks/` within the task directory
