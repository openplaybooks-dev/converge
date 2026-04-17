# Phase 3: Architect the Plan

## Mission

Transform requirements into an executable harness plan: epics, nested tasks, WBS, API needs, facts, checks, and skills.

**Inputs:**
- `.harness/analysis.md` (from Phase 1)
- `.harness/requirements.md` (from Phase 2)

**Outputs:**
- `.harness/plan.md` (master plan)
- `.harness/epics/` (executable task structure)

---

## Step 3.1: Define Epics

Break the project into 3-7 epics. Each epic is a logical phase of work.

### Epic Naming Convention
```
01-{phase-name}     # Two-digit prefix + kebab-case
02-{phase-name}
03-{phase-name}
```

### Epic Sizing Rules
- **3-7 tasks per epic** — More means split it
- **Clear deliverable** — Each epic produces something usable
- **Sequential or parallel** — Epics can depend on each other or run independently

### Common Epic Patterns

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

### Write EPIC.md for Each

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

---

## Step 3.2: Define Tasks per Epic

For each epic, create tasks with full metadata.

### Task Structure

Each task needs a `TASK.md` with YAML frontmatter:

```yaml
---
id: 001-task-name
title: Human-Readable Title
description: What this task accomplishes
dependencies:
  - upstream-task-id              # Same-epic dep
  - 01-requirements.002-spec      # Cross-epic dep
inputs:
  - path/to/input/file
outputs:
  - path/to/output/file
skills:
  - skill-name                    # Harness skill to invoke
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
- **15-45 min AI execution** — If longer, split into subtasks

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

Use WBS when a task spawns N similar subtasks from data.

### When to Use WBS

| Pattern | Use WBS? | Why |
|---------|----------|-----|
| Generate 8 pages from a list | Yes | N similar items from data |
| Create one config file | No | Single task |
| Process each entity in data model | Yes | N similar items from data |
| Setup database schema | No | Single task |
| Generate tests for each endpoint | Yes | N similar items from data |

### WBS Template (wbs.js)

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

```yaml
---
id: 003-generate-screens
title: Generate UI Screens
description: Spawn one task per screen from screens.json
wbs:
  type: nodejs
  path: ./wbs.js
inputs:
  - .stitch/screens.json
outputs:
  - src/pages/*.tsx
---

# Generate UI Screens

This task reads screens.json and spawns a subtask for each screen.
Each subtask generates the page component.
```

---

## Step 3.5: Map Skills

Assign harness skills to tasks that need specialized execution.

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
| Endpoint | Method | Purpose | Epic/Task |
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

## Step 3.8: Write plan.md

Compile everything into `.harness/plan.md`:

```markdown
# Project Plan

## Overview
[One paragraph: what we're building and approach]

## Facts
[All facts from Step 3.7]

## Epic Structure
[Overview of all epics with dependency flow]

## Epic Flow
\```
01-requirements
   ↓
02-foundation
   ↓
03-data-layer ──┐
   ↓            │
04-ui-screens ──┤
   ↓            │
05-behavior ────┘
   ↓
06-integration
   ↓
07-polish
\```

## API Needs
[From Step 3.6]

## WBS Summary
| Task | Data Source | Spawns |
|------|-----------|--------|
| 04.003-generate-screens | screens.json | 1 per screen |
| 03.004-generate-endpoints | api-spec.json | 1 per endpoint |

## Skills Used
| Skill | Used By | Purpose |
|-------|---------|---------|
| ux-design | 01.001 | Generate UX spec |
| taste-design | 02.002 | Generate design system |

## Risk Register
- [Risk]: [Mitigation]
- [Risk]: [Mitigation]
```

---

## Step 3.9: Create Epic/Task Files

Create the actual `.harness/epics/` directory structure:

```bash
mkdir -p .harness/epics/01-requirements/001-gather-needs
mkdir -p .harness/epics/02-foundation/001-setup-project
mkdir -p .harness/epics/02-foundation/002-design-system
# ... etc
```

Write `EPIC.md` and `TASK.md` for each.

---

## Dependency Mapping

### Rules
- **Same-epic:** Use task ID only: `001-setup`
- **Cross-epic:** Use `epic-id.task-id`: `01-requirements.002-spec`
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

- `.harness/plan.md` exists with all sections
- `.harness/epics/` structure created with EPIC.md and TASK.md files
- Every task has: id, title, outputs, checks
- Dependencies are explicit and acyclic
- Facts documented (minimum 5)
- API needs listed (if applicable)
- WBS identified for repetitive tasks
- Skills assigned where available

---

## Next Phase

After the plan is created, proceed to `playbooks/validate.md` for verification.
