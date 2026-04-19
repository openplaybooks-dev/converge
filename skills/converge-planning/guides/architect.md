# Phase 3: Architect the Plan

## Mission

Transform requirements into an executable converge plan: task hierarchies, WBS, API needs, facts, checks, and skills.

**Inputs:**
- `.converge/analysis.md` (from Phase 1)
- `.converge/requirements.md` (from Phase 2)

**Outputs:**
- `playbook.yml` (manifest)
- `.converge/playbooks/{name}/tasks/` (executable task structure)

---

## Step 3.1: Define Top-Level Tasks

Break the project into 3-7 top-level tasks. Each is a logical phase of work.

### Naming Convention
```
NN-{name}           # Two-digit prefix for top-level tasks
NNN-{name}          # Three-digit prefix for children
```

### Task Sizing Rules
- **3-7 children per task** — More means split it
- **Clear deliverable** — Each task produces something usable
- **Sequential or parallel** — Tasks can depend on each other or run independently
- **Nest as deep as needed** — A child task can itself have children

### Common Decomposition Patterns

**Full-Stack App:**
```
01-requirements          # Gather needs, define scope
02-foundation            # Project setup, design system, tokens
03-data-layer            # Data models, types, API routes
04-ui-screens            # Build pages and components
05-behavior              # State management, interactivity
06-integration           # Connect UI to API, wire everything
07-polish                # Testing, performance, deployment
```

**API Project:**
```
01-requirements          # API spec, data models
02-foundation            # Project setup, database schema
03-core-endpoints        # Primary CRUD endpoints
04-business-logic        # Complex business rules
05-auth-permissions      # Authentication & authorization
06-testing               # Integration & load tests
07-deployment            # CI/CD, monitoring
```

**Data Pipeline:**
```
01-requirements          # Define sources, transformations, targets
02-ingestion             # Data source connectors
03-transformation        # Processing & cleaning
04-storage               # Database/warehouse setup
05-api                   # Query API layer
06-monitoring            # Alerts, dashboards
```

### Write TASK.md for Each Task

Every task — at any nesting level — gets a `TASK.md` with the same schema. A task with children defines scope, outputs, and checks for the group. A leaf task defines its own work.

```yaml
---
id: 01-prepare-requirements
title: Prepare Requirements
description: Validate app idea, generate PRD, generate UX spec, extract screen definitions
blocking: true
outputs:
  - PRD.md
  - .stitch/UX.md
  - .stitch/screens.json
checks:
  - id: ux-spec-exists
    cmd: test -f .stitch/UX.md
    description: UX specification exists
---

# Prepare Requirements

Gathers requirements and produces foundational artifacts:
1. Validate app idea
2. Generate PRD
3. Generate UX overview
4. Breakdown UX to screens
```

---

## Step 3.2: Define Child Tasks

For each top-level task, create children. Children can themselves have children — nest as deep as the problem requires.

### Task Structure

Every task uses the same `TASK.md` schema regardless of nesting depth:

```yaml
# Location: .converge/playbooks/{name}/tasks/{NN-task}/{NNN-child}/TASK.md
---
id: 001-task-name
title: Human-Readable Title
description: What this task accomplishes
dependencies:
  - upstream-task-id              # Sibling dep (same level)
  - 01-requirements.002-spec      # Cross-branch dep
inputs:
  - path/to/input/file
outputs:
  - path/to/output/file
skills:
  - skill-name                    # Converge skill to invoke
references:
  - skill-library-name            # Skill libraries to reference
vars:
  key: value                      # Template variables (passed to WBS/children)
tags:
  - category
checks:
  - id: check-id
    cmd: shell-command-that-returns-0-on-success
    description: What this validates
---

# Task Title

[Step-by-step instructions for the AI executor]
```

### Task Sizing Rules
- **Single responsibility** — One task, one purpose
- **Clear outputs** — Specific files, not vague deliverables
- **Testable** — Every output has a check
- **15-45 min AI execution** — If longer, split into children

---

### Designing Context Contracts

Every task defines a context contract via `inputs` (Context In) and `outputs` (Context Out). When designing tasks, follow these rules:

**Every input must be an upstream output.** If a task reads `screens.json`, some prior task must produce it in its `outputs`. Orphan inputs break the context chain.

**Every output should be consumed downstream.** If a task produces a file nothing reads, flag it. It may still be valid (documentation, final deliverable) but should be a conscious choice.

**Minimal context rule.** List only the specific files a task needs — not broad globs like `src/**/*`. Narrow inputs make the task's boundary clear and reduce wasted context for the executor.

Example context chain for a screen build pipeline:

```
001-spec:    outputs: [screen-spec.md]
                ↓
002-design:  inputs:  [screen-spec.md]    outputs: [design.html]
                                              ↓
003-convert: inputs:  [design.html]       outputs: [Screen.tsx]
                                              ↓
004-split:   inputs:  [Screen.tsx]        outputs: [components/*.tsx]
```

Each task reads exactly what the prior task produced. No hidden dependencies, no over-broad inputs.

See `preferences/context-principles.md` (Principle 2) for the full reference.

---

## Step 3.3: Design Checks

Every task needs checks. Layer them from basic to semantic.

### Check Layers

```yaml
checks:
  # Layer 1: Existence
  - id: file-exists
    cmd: test -f output.md
    description: Output file created

  # Layer 2: Non-empty
  - id: file-nonempty
    cmd: test -s output.md
    description: Output file is not empty

  # Layer 3: Structure
  - id: has-sections
    cmd: grep -q "## Overview" output.md
    description: Has required Overview section

  # Layer 4: Validity
  - id: valid-json
    cmd: jq empty data.json
    description: Valid JSON format

  # Layer 5: Compilation
  - id: typescript-compiles
    cmd: npx tsc --noEmit
    description: TypeScript compiles without errors

  # Layer 6: Tests pass
  - id: tests-pass
    cmd: npm test -- --passWithNoTests
    description: All tests passing
```

### Check Design Rules
- **At minimum:** File existence + non-empty for every output
- **For code:** Add compilation check
- **For data:** Add format validation (JSON, YAML, etc.)
- **For features:** Add functional check if possible
- **Never:** Exact string matching (too brittle)

---

## Step 3.4: Identify WBS Candidates

Use WBS when a task spawns N similar children from data.

### When to Use WBS

| Pattern | Use WBS? | Why |
|---------|----------|-----|
| Generate 8 pages from a list | Yes | N similar items from data |
| Create one config file | No | Single task |
| Process each entity in data model | Yes | N similar items from data |
| Setup database schema | No | Single task |
| Generate tests for each endpoint | Yes | N similar items from data |

### WBS Template (wbs/index.js)

```javascript
export async function run(ctx) {
  // Read data source
  const items = JSON.parse(
    readFileSync(join(ctx.projectDir, 'data-source.json'), 'utf-8')
  );

  let prevId = null;
  for (const [index, item] of items.entries()) {
    const taskId = `001-${String(index + 1).padStart(3, '0')}-${item.id}`;
    
    await ctx.spawn({
      id: taskId,
      title: `Process ${item.name}`,
      dependencies: prevId ? [prevId] : [],    // Sequential
      // dependencies: [],                      // Parallel
      inputs: [`source/${item.id}.json`],
      outputs: [`output/${item.id}.txt`],
      skills: ['relevant-skill'],
      checks: [
        { id: 'exists', cmd: `test -f output/${item.id}.txt`, description: `${item.name} output exists` }
      ],
      body: `Process ${item.name} according to specification.`,
    });

    prevId = taskId;  // For sequential chaining (remove for parallel)
  }
}
```

### WBS in TASK.md

The task has `wbs:` pointing to `wbs/index.js`, and WBS-spawned children go into a `tasks/` subdirectory:

```yaml
---
id: 003-generate-screens
title: Generate UI Screens
description: Spawn one task per screen from screens.json
wbs:
  type: nodejs
  path: ./wbs/index.js
inputs:
  - .stitch/screens.json
outputs:
  - src/pages/*.tsx
---

# Generate UI Screens

This task reads screens.json and spawns a child task for each screen.
Each child generates the page component.

# Directory structure after WBS runs:
# 003-generate-screens/
# ├── TASK.md
# ├── wbs/
# │   └── index.js
# └── tasks/          ← WBS-spawned children
#     ├── 001-home/TASK.md
#     ├── 002-dashboard/TASK.md
#     └── 003-settings/TASK.md
```

---

## Step 3.5: Map Skills

Assign converge skills to tasks that need specialized execution.

### Skill Assignment Rules
- **Skill exists?** Reference it in `skills:` frontmatter
- **No skill exists?** Write instructions directly in TASK.md body
- **Task uses external tool?** Document the tool in instructions

```yaml
# Task that uses a skill
skills:
  - ux-design

# Task that uses AI directly (no skill)
executor:
  type: ai
  prompt: |
    Create the component following React best practices...
```

---

## Step 3.6: Document API Needs

List all APIs and integrations the project requires.

```markdown
## API Needs

### Internal APIs (to build)
| Endpoint | Method | Purpose | Task |
|----------|--------|---------|-----------|
| `/api/users` | GET | List users | 03-api.001 |
| `/api/users/:id` | GET | Get user | 03-api.001 |
| `/api/projects` | POST | Create project | 03-api.002 |

### External APIs (to integrate)
| Service | Purpose | Auth | Config Needed |
|---------|---------|------|---------------|
| Stripe | Payments | API Key | STRIPE_SECRET_KEY |
| SendGrid | Email | API Key | SENDGRID_API_KEY |
| Auth0 | Authentication | OAuth | AUTH0_DOMAIN, AUTH0_CLIENT_ID |

### API Facts
- FACT: All internal endpoints require JWT auth header
- FACT: Stripe webhooks need /api/webhooks/stripe endpoint
- FACT: Rate limit: 100 req/min per user on external APIs
```

---

## Step 3.7: Compile Facts

Gather all facts from analysis, discovery, and architecture phases.

```markdown
## Facts

### Tech Facts
- FACT: Uses React 19 + TypeScript 5.4 + Vite 6
- FACT: Tailwind CSS with custom design tokens
- FACT: Deployed on Vercel (serverless)

### Data Facts
- FACT: PostgreSQL via Supabase
- FACT: Users → Projects → Tasks (1:N:N)
- FACT: Max 10MB file upload limit

### Constraint Facts
- FACT: Must support Chrome, Firefox, Safari (last 2 versions)
- FACT: WCAG 2.1 AA compliance required
- FACT: Cannot modify existing auth middleware

### Business Facts
- FACT: MVP deadline: March 2025
- FACT: Max 100 concurrent users at launch
- FACT: Free tier + paid tier pricing model
```

---

Facts are the primary **context interpolation** mechanism across task hierarchies. While `inputs`/`outputs` pass files between tasks, facts pass knowledge. A fact discovered in one task group (e.g., "Auth uses JWT with RS256") is available to all downstream tasks without needing to thread it through individual task inputs.

---

## Step 3.8: Write playbook.yml

Create the playbook manifest at `.converge/playbooks/{name}/playbook.yml`:

```yaml
name: default
description: End-to-end app generation
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
```

Facts, API needs, WBS summaries, skills used, and risk register are documentation conventions. They go into:
- Task TASK.md bodies at any level (scoped facts and API needs)
- The playbook `description` field (high-level overview)
- Individual task TASK.md bodies (task-specific details)

There is no separate `plan.md` file.

---

## Step 3.9: Create Task Files

Create the actual `.converge/playbooks/{name}/tasks/` directory structure:

```bash
mkdir -p .converge/playbooks/default/tasks/01-requirements/001-gather-needs
mkdir -p .converge/playbooks/default/tasks/02-foundation/001-setup-project
mkdir -p .converge/playbooks/default/tasks/02-foundation/002-design-system
# ... etc
```

Write `TASK.md` for every task at every level.

---

## Dependency Mapping

### Rules
- **Sibling:** Use task ID only: `001-setup`
- **Cross-branch:** Use dotted path: `01-requirements.002-spec`
- **Top-level deps:** Defined in `playbook.yml` via `depends_on`
- **No circular deps** — If you find a cycle, split the task
- **Minimize deps** — Only depend on what you actually consume

### Visualization
```
01.001 → 01.002
              ↓
         02.001 → 02.002 → 02.003
                               ↓
                          03.001 → 03.002
                                      ↓
                                 04.001 (WBS)
                                   ├── 04.001-001
                                   ├── 04.001-002
                                   └── 04.001-003
```

---

## Success Criteria

- `playbook.yml` exists with task list and dependencies
- `.converge/playbooks/{name}/tasks/` structure created with TASK.md at every level
- Every task has: id, title, outputs, checks
- Dependencies are explicit and acyclic
- Facts documented (minimum 5)
- API needs listed (if applicable)
- WBS identified for repetitive tasks
- Skills assigned where available

---

## Next Phase

After the plan is created, proceed to `playbooks/validate.md` for verification.
