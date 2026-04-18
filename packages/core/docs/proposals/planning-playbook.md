# Proposal: Built-in Planning Playbook

**Status**: Draft
**Date**: 2026-04-15

---

## One Sentence

Add a built-in `plan` playbook that auto-scans the current project state and takes a user prompt to generate (or update) a full converge playbook — turning `converge plan --prompt "..."` into continuous, decomposable, top-down planning.

---

## Problem

Today, the `converge-planning` skill provides excellent planning _guidance_ — analyze, discover, architect, validate — but it's a passive reference. A human (or AI agent) must manually:

1. Read SKILL.md, pick the right phase
2. Load the right playbook (analyze.md, discovery.md, etc.)
3. Run each step manually
4. Create `.converge/` artifacts by hand
5. Repeat if the plan needs refinement

This is powerful for expert users but creates friction for the common case: **"I have a codebase and an idea — give me a plan I can run."**

### What's Missing

| Gap                                  | Impact                                                         |
| ------------------------------------ | -------------------------------------------------------------- |
| No single command to generate a plan | Users must orchestrate 4 phases manually                       |
| No auto-scan of current state        | Phase 1 (analyze) requires manual exploration                  |
| No prompt-driven planning            | Phase 2 (discover) requires interactive Q&A                    |
| No iterative refinement              | Re-planning means starting from scratch                        |
| No playbook output                   | Plans live in `.converge/epics/` but aren't runnable playbooks |

---

## Solution

A **built-in `plan` playbook** — a meta-playbook that generates other playbooks.

### Two Inputs, One Output

```
┌─────────────────────────────────┐
│         converge plan            │
│                                 │
│  Input 1: --prompt "..."        │  ← What the user wants
│  Input 2: (auto-scanned cwd)    │  ← What already exists
│                                 │
│         ┌─────────┐             │
│         │  scan    │─────┐      │
│         └─────────┘     │      │
│         ┌─────────┐     ▼      │
│         │ research │─────┐      │
│         └─────────┘     │      │
│         ┌───────────┐   ▼      │
│         │ decompose │───┐      │
│         └───────────┘   │      │
│         ┌──────────┐    ▼      │
│         │ validate  │───┐      │
│         └──────────┘    │      │
│         ┌──────────┐    ▼      │
│         │   emit   │          │
│         └──────────┘          │
│                                 │
│  Output: .converge/playbooks/X/  │  ← Runnable playbook
└─────────────────────────────────┘
```

### CLI Interface

```bash
# Generate a new playbook from a prompt
converge plan --prompt "Build a todo app with auth and real-time sync"

# Generate with a specific playbook name
converge plan --prompt "Add dark mode support" --name dark-mode

# Re-plan: update an existing playbook
converge plan --prompt "Add offline support" --name my-app --update

# Plan from an existing requirements doc
converge plan --prompt "Implement the features described in REQUIREMENTS.md"

# Equivalent long form (plan is a built-in playbook)
converge run --playbook=plan --prompt="Build a todo app with auth"
```

### What Happens

```
converge plan --prompt "Build a dashboard with real-time data"

  000-setup-skills — SETUP
    ├── Install converge-planning skill to .converge/skills/
    ├── Verify SKILL.md, playbooks/, preferences/ are present
    └── All subsequent tasks can now reference skill materials

  001-scan — SCAN (auto)
    ├── Detect tech stack from package.json, tsconfig, etc.
    ├── Map file structure (directories, file counts)
    ├── Assess current state (build status, tests, git)
    ├── Identify existing patterns and conventions
    └── Output: .converge/plan-state/analysis.json

  002-research — RESEARCH (from prompt)
    ├── Parse user prompt into structured requirements
    ├── Infer missing details from project context
    ├── Identify features, constraints, priorities
    ├── Cross-reference with existing codebase capabilities
    └── Output: .converge/plan-state/requirements.json

  003-outline — OUTLINE (high-level)
    ├── Select project pattern (full-stack, API, CLI, etc.)
    ├── Identify 3-7 epics with complexity estimates
    ├── Map epic-level dependency graph
    └── Output: .converge/plan-state/outline.json

  003-decompose — DECOMPOSE (delegated per-epic)          ← WBS parent
    ├── Reads outline.json, spawns one subtask per epic
    ├── 003-001-01-foundation → decompose epic into tasks
    ├── 003-002-02-data-layer → decompose epic into tasks
    ├── 003-003-03-ui-screens → decompose epic into tasks
    ├── ...each subtask flags oversized tasks for deepening
    └── Output: .converge/plan-state/epics/<epic-id>.json (per epic)

  003-merge — MERGE
    ├── Combine all per-epic plans into master plan
    ├── Collect needsDeepening flags from epic subtasks
    └── Output: .converge/plan-state/plan.json

  003-deepen — DEEPEN (conditional, self-decomposable)    ← WBS parent
    ├── Reads plan.json, checks needsDeepening
    ├── If tasks are oversized → spawns sub-decomposition subtasks
    │   ├── 003-d-001-* → break down "generate 12 endpoints" into subtasks
    │   ├── 003-d-002-* → break down "build 8 screens" into subtasks
    │   └── ...
    ├── If nothing needs deepening → zero subtasks, completes immediately
    └── Output: .converge/plan-state/deepened/<epic>-<task>.json

  003-finalize — FINALIZE
    ├── Merge deepening results into plan.json
    ├── Convert oversized tasks to WBS parents
    └── Output: .converge/plan-state/plan.json (updated)

  004-validate — VALIDATE
    ├── Check structural completeness
    ├── Verify dependency integrity (no cycles)
    ├── Validate input/output chains
    ├── Ensure requirements coverage
    └── Output: .converge/plan-state/validation.json

  005-emit — EMIT
    ├── Generate playbook.yml
    ├── Generate TASK.md for each task
    ├── Generate wbs.js where needed
    ├── Write to .converge/playbooks/<name>/
    └── Output: runnable playbook
```

### Delegation Pattern

The decompose phase follows a **"scan N items, delegate each to a subtask"** pattern:

```
003-outline (AI task)
    │ identifies N epics
    ▼
003-decompose (WBS parent)
    │ reads outline.json
    ├── spawns 003-001-epic-A (AI task) → decomposes epic A
    ├── spawns 003-002-epic-B (AI task) → decomposes epic B
    └── spawns 003-003-epic-C (AI task) → decomposes epic C
                    │ each can flag oversized tasks
                    ▼
003-merge (AI task)
    │ collects needsDeepening flags
    ▼
003-deepen (conditional WBS parent)
    │ reads plan.json.needsDeepening
    ├── spawns 003-d-001 (AI task) → sub-decomposes oversized task X
    ├── spawns 003-d-002 (AI task) → sub-decomposes oversized task Y
    └── (or spawns zero tasks if nothing needs deepening)
```

This ensures:

- Each epic gets its own AI execution context (better focus, less confusion)
- Complex tasks are automatically identified and broken down further
- The pipeline self-decomposes to match project complexity
- Simple projects skip the deepen phase entirely (zero overhead)

---

## Design Details

### Playbook Type: Keyed on Prompt

The `plan` playbook is a **keyed playbook** — each invocation with a different `--prompt` or `--name` generates a fresh planning pipeline.

```yaml
# Built-in: skills/converge-planning/playbooks/plan/playbook.yml
name: plan
description: Generate a converge playbook from a prompt and project scan

inputs:
  prompt:
    required: true
    description: What the user wants to build or accomplish
  name:
    required: false
    description: Name for the generated playbook (default: derived from prompt)
  update:
    required: false
    description: If true, update an existing playbook instead of creating new

key: name

run:
  mode: autonomous
  maxTaskAttempts: 3
  maxDuration: 15m
  resume: true
```

### WBS Pipeline (wbs.js)

The root task spawns 5 phases as a sequential pipeline:

```
001-scan → 002-research → 003-decompose → 004-validate → 005-emit
```

Each phase:

- Has explicit **inputs** and **outputs** (JSON files in `.converge/plan-state/`)
- Has **checks** (output file exists, valid JSON, required fields present)
- References the `converge-planning` skill for domain knowledge
- Is self-contained — can be re-run independently

### Phase Details

#### 001-scan: Project State Scan

**Purpose**: Automatically understand what exists in the cwd.

**What it does**:

- Detects tech stack (package.json, tsconfig, requirements.txt, etc.)
- Maps file structure (directory tree, file counts by type)
- Assesses current state (build passes? tests? git status?)
- Identifies patterns (naming conventions, state management, API style)
- Lists external dependencies (env vars, third-party services)

**Output**: `.converge/plan-state/analysis.json`

```json
{
  "techStack": {
    "runtime": "Node.js 20",
    "framework": "Next.js 15",
    "language": "TypeScript",
    "build": "Vite",
    "styling": "Tailwind",
    "packageManager": "npm"
  },
  "structure": {
    "sourceFiles": 85,
    "testFiles": 12,
    "keyDirectories": ["src/components", "src/api", "src/lib"]
  },
  "state": {
    "buildPasses": true,
    "testsPassing": 12,
    "testsFailing": 0,
    "lastCommit": "feat: add user dashboard",
    "uncommittedChanges": 4
  },
  "patterns": {
    "naming": "PascalCase components, camelCase functions",
    "stateManagement": "zustand",
    "apiStyle": "REST with fetch"
  },
  "externalDeps": ["PostgreSQL", "Auth0", "Stripe"],
  "facts": [
    "App uses Next.js 15 App Router — Source: package.json",
    "Auth is handled by Auth0 — Source: .env.example",
    "Database is PostgreSQL via Supabase — Source: .env.example"
  ]
}
```

**Skip condition**: If `.converge/plan-state/analysis.json` already exists and cwd hasn't changed, reuse it.

#### 002-research: Prompt Analysis

**Purpose**: Parse the user's prompt into structured requirements.

**What it does**:

- Extracts features, goals, and constraints from the prompt
- Infers priorities (what's core vs. nice-to-have)
- Cross-references with existing codebase (what's already built?)
- Identifies gaps (what needs to be built from scratch vs. extended?)
- Generates facts from both prompt and project analysis

**Input**: `.converge/plan-state/analysis.json` + user prompt
**Output**: `.converge/plan-state/requirements.json`

```json
{
  "vision": "Build a real-time dashboard for monitoring IoT devices",
  "features": [
    { "name": "Device list view", "priority": "must", "status": "new" },
    { "name": "Real-time data stream", "priority": "must", "status": "new" },
    { "name": "Alert configuration", "priority": "should", "status": "new" },
    { "name": "User authentication", "priority": "must", "status": "exists" }
  ],
  "constraints": [
    "Must use existing Next.js setup",
    "Must integrate with existing Auth0 auth"
  ],
  "facts": [
    "Auth already implemented — reuse existing middleware",
    "Need WebSocket or SSE for real-time data",
    "Dashboard requires charting library"
  ],
  "openQuestions": [
    "Which IoT protocol? MQTT? HTTP polling?",
    "How many devices at scale?"
  ]
}
```

#### 003-decompose: Top-Down Planning

**Purpose**: Break requirements into a hierarchical plan of epics and tasks.

**What it does**:

- Selects the best project pattern from `preferences/project-patterns.md`
- Generates epics (3-7 per project)
- Breaks each epic into tasks (3-7 per epic)
- Maps dependencies (intra-epic and cross-epic)
- Identifies WBS candidates (tasks that spawn N similar subtasks)
- Assigns checks to every task
- Documents API needs and facts

**Decomposition Strategy** (the key innovation):

```
Level 0: User prompt → Project vision + feature list
Level 1: Features → Epics (logical work packages)
Level 2: Epics → Tasks (atomic work units)
Level 3: Tasks → WBS subtasks (only for N-similar-items patterns)
```

The decomposition is **depth-adaptive**:

- Simple projects (< 5 features): 2-3 epics, flat tasks
- Medium projects (5-15 features): 4-6 epics, some WBS
- Complex projects (15+ features): 6-7 epics, WBS for repetitive work, sub-epic splits

**Input**: `.converge/plan-state/requirements.json` + `.converge/plan-state/analysis.json`
**Output**: `.converge/plan-state/plan.json`

```json
{
  "name": "iot-dashboard",
  "pattern": "full-stack-app",
  "epics": [
    {
      "id": "01-foundation",
      "title": "Foundation",
      "tasks": [
        {
          "id": "001-setup-deps",
          "title": "Install dependencies",
          "outputs": ["package.json"],
          "checks": [{ "id": "deps-installed", "cmd": "npm ls --depth=0" }]
        },
        {
          "id": "002-data-models",
          "title": "Define data models",
          "outputs": ["src/types/device.ts", "src/types/alert.ts"],
          "checks": [{ "id": "types-compile", "cmd": "npx tsc --noEmit" }],
          "dependencies": ["001-setup-deps"]
        }
      ]
    },
    {
      "id": "02-device-views",
      "title": "Device Views",
      "wbs": true,
      "wbsSource": "requirements.features.filter(f => f.category === 'view')",
      "tasks": []
    }
  ],
  "facts": ["..."],
  "apiNeeds": { "internal": [], "external": [] },
  "dependencyGraph": {
    "01-foundation": [],
    "02-device-views": ["01-foundation"]
  }
}
```

#### 004-validate: Plan Verification

**Purpose**: Ensure the plan is complete, consistent, and executable.

**Checks**:

- Every epic has at least 1 task, no more than 7
- Every task has outputs and checks
- All dependencies resolve (no broken refs, no cycles)
- Input/output chains are complete (no missing inputs)
- All "must-have" requirements map to at least one task
- Facts are specific and measurable

**Input**: `.converge/plan-state/plan.json` + `.converge/plan-state/requirements.json`
**Output**: `.converge/plan-state/validation.json`

#### 005-emit: Write Playbook Files

**Purpose**: Convert the validated plan into runnable playbook files.

**What it generates**:

```
.converge/playbooks/<name>/
├── playbook.yml           ← from plan metadata
├── tasks/
│   ├── 01-foundation/
│   │   ├── TASK.md        ← from plan.epics[0] (epic-level)
│   │   └── tasks/
│   │       ├── 001-setup-deps/
│   │       │   └── TASK.md
│   │       └── 002-data-models/
│   │           └── TASK.md
│   ├── 02-device-views/
│   │   ├── TASK.md        ← WBS parent
│   │   └── wbs.js         ← generated WBS script
│   └── 03-integration/
│       └── ...
└── goals/
    └── 001-builds-clean/
        └── GOAL.md
```

**Update mode**: When `--update` is passed, the emit phase:

1. Reads the existing playbook
2. Diffs against the new plan
3. Adds new tasks, updates changed tasks
4. Preserves completed task state from the journal
5. Does NOT delete tasks that are already complete

---

## Continuous / Deep / Decomposable Planning

The planning playbook supports three modes of iterative refinement:

### 1. Continuous Planning (re-run to refine)

```bash
# Initial plan
converge plan --prompt "Build a todo app" --name todo-app

# User reviews, wants changes
converge plan --prompt "Add collaborative editing and offline sync" --name todo-app --update

# Plan evolves — new tasks added, existing preserved
```

Each re-run:

- Re-scans the project (picks up new files, updated state)
- Merges new requirements with existing
- Adds/updates tasks without destroying progress

### 2. Deep Planning (self-decomposable delegation)

The decompose phase delegates per-epic work to subtasks. Each subtask
can flag tasks that are too complex, triggering automatic sub-decomposition:

```
Level 0: 003-outline identifies 5 epics
Level 1: 003-decompose spawns 5 subtasks (one per epic)
  → 003-001-01-foundation decomposes into 3 tasks (simple, done)
  → 003-002-02-data-layer decomposes into 5 tasks
      flags "003-api-endpoints" as needing deepening (12 endpoints)
  → 003-003-03-ui-screens decomposes into 4 tasks
      flags "002-page-components" as needing deepening (8 pages)
Level 2: 003-deepen reads needsDeepening, spawns 2 subtasks
  → 003-d-001 sub-decomposes "api-endpoints" into 12 endpoint tasks
  → 003-d-002 sub-decomposes "page-components" into 8 page tasks
Level 3: 003-finalize merges sub-decomposition into WBS definitions
```

The key pattern is **"scan N items, delegate each to a subtask"** — the parent
never does the detailed work itself. This means:

- Each AI execution context is focused on one epic or one complex task
- The pipeline automatically adapts depth to project complexity
- Simple projects (no flags) skip deepening entirely (zero overhead)

### AI-Driven WBS (`type: ai`)

The decompose and deepen phases use a new WBS mode: `type: ai`. Instead of a
hand-written `wbs.js`, Converge drives AI to generate the script dynamically:

```yaml
wbs:
  type: ai
  prompt: |
    Read outline.json. For each epic, spawn a subtask
    that detail-decomposes it into tasks.
```

**Flow:**

```
TASK.md (type: ai, prompt)
    ↓
converge reads prompt + task context (vars, inputs, project state)
    ↓
AI generates wbs.js (using WBS API reference + examples)
    ↓
converge validates wbs.js (syntax, ESM, spawn calls)
    ↓
converge executes wbs.js via standard nodejs WBS executor
    ↓
child TASK.md files written to disk
```

**Two-level AI flow:** The generated `wbs.js` can itself call `ctx.ai.ask()`
during execution, enabling AI-analyzed decomposition:

```js
// AI-generated wbs.js calls ctx.ai.ask() to analyze code
const analysis = await ctx.ai.ask(
  'Scan src/api/ and list all route handlers with complexity estimates'
).asJson(FileAnalysisSchema);

for (const file of analysis.files) {
  await ctx.spawn({ id: `001-${file.slug}`, ... });
}
```

This is the most powerful decomposition mode — AI both generates the WBS
structure and uses AI during execution to make per-item decisions.

See `preferences/wbs-ai-guide.md` for the complete reference.

### 3. Dynamic Planning (plan during execution)

When running a generated playbook, new planning needs can emerge:

```bash
# Generate initial plan
converge plan --prompt "Build a dashboard" --name dashboard

# Start executing
converge run --playbook=dashboard

# Midway through, realize we need more planning
converge plan --prompt "Add export-to-PDF feature" --name dashboard --update

# Resume execution with updated plan
converge run --playbook=dashboard
```

The plan and execution are **decoupled** — you can interleave planning and execution freely.

---

## System Playbook Initialization

The built-in `plan` playbook ships as a **system playbook** inside the `converge-planning` skill:

```
skills/converge-planning/
├── SKILL.md
├── playbooks/
│   ├── analyze.md
│   ├── discovery.md
│   ├── architect.md
│   ├── validate.md
│   └── plan/                    ← NEW: system playbook
│       ├── playbook.yml
│       └── tasks/
│           ├── TASK.md
│           └── wbs.js
└── preferences/
    ├── plan-schema.md
    └── project-patterns.md
```

When the user runs `converge plan` for the first time:

1. Converge detects the `plan` playbook is a **system playbook** (not in `.converge/playbooks/`)
2. Copies it to `.converge/playbooks/plan/`
3. Runs it as a normal keyed playbook

This means:

- Users can customize the planning playbook after initialization
- System playbooks serve as templates, not locked resources
- `converge plan --prompt "..."` works out of the box with no setup

---

## Integration with Existing Skills

The planning playbook leverages — but does not replace — the existing skill layers:

```
converge plan --prompt "..."
  │
  ├── Phase 1 (scan)      → Uses analyze.md patterns
  ├── Phase 2 (research)  → Uses discovery.md patterns
  ├── Phase 3 (decompose) → Uses architect.md + project-patterns.md
  ├── Phase 4 (validate)  → Uses validate.md checklist
  └── Phase 5 (emit)      → Uses plan-schema.md for output format
```

The skill's playbooks and preferences remain as **reference material** for the AI executor. The `plan` playbook orchestrates them into an automated pipeline.

---

## File Changes

### New Files

| File                                                                       | Purpose                                             |
| -------------------------------------------------------------------------- | --------------------------------------------------- |
| `skills/converge-planning/playbooks/plan/playbook.yml`                     | System playbook config                              |
| `skills/converge-planning/playbooks/plan/tasks/TASK.md`                    | Root WBS task                                       |
| `skills/converge-planning/playbooks/plan/tasks/wbs.js`                     | Main pipeline generator                             |
| `skills/converge-planning/playbooks/plan/tasks/wbs/decompose-epics-wbs.js` | Per-epic delegation WBS (nodejs fallback)           |
| `skills/converge-planning/playbooks/plan/tasks/wbs/deepen-tasks-wbs.js`    | Conditional sub-decomposition WBS (nodejs fallback) |
| `skills/converge-planning/preferences/wbs-ai-guide.md`                     | AI-driven WBS reference and patterns                |
| `examples/planning/README.md`                                              | Example documentation                               |
| `examples/planning/.converge/playbooks/plan/`                              | Example playbook (mirrors skill)                    |
| `docs/proposals/planning-playbook.md`                                      | This proposal                                       |

### Modified Files

| File                                | Change                                                            |
| ----------------------------------- | ----------------------------------------------------------------- |
| `skills/converge-planning/SKILL.md` | Add `plan` playbook to phase detection matrix and quick reference |

---

## Open Questions

1. **Prompt storage**: Should the original prompt be saved in `.converge/plan-state/prompt.md` for re-planning context?
2. **Plan diffing**: When `--update` is used, should we show a diff of plan changes before applying?
3. **Interactive mode**: Should `converge plan` support `--interactive` for the discovery phase (ask clarifying questions)?
4. **Plan approval**: Should the validate phase pause for user approval before emit, or emit and let the user review?
5. **Nested playbooks**: Should the emitted playbook be able to reference the `plan` playbook for re-planning from within execution?

---

## Non-Goals

- **Replacing the skill**: The `converge-planning` skill remains the authoritative reference for manual planning. The playbook automates the common case.
- **AI model selection**: The playbook doesn't pick which AI model to use — that's a runtime concern.
- **Execution**: The `plan` playbook only generates plans. Execution is handled by `converge run --playbook=<generated-name>`.
- **Project management**: No Gantt charts, timelines, or resource allocation. Just task decomposition.
