# Planning Pipeline

The planning pipeline is a systematic **information interpolation** process. Each phase reads all prior artifacts, cross-references them to identify gaps, and produces a richer artifact that fills those gaps. The cumulative knowledge grows monotonically until the gap between "what we know" and "what we need" reaches zero.

## Interpolation Model

Planning is interpolation between two known points: **what exists** (analysis) and **what's desired** (prompt). Each phase fills in intermediate knowledge, just like interpolating data points between known values:

```
  KNOWN (prompt)                                           TARGET (executable plan)
       |                                                        |
       |   interpolate      interpolate      interpolate        |
       |   ground truth     gaps             structure          |
       v        v                v                v             |
  analysis  requirements     outline         epics/*.json       |
       |        |                |                |             |
       |        +---- cross-reference ----+       |             |
       |                                  v       v             |
       |                              plan.json (merged)        |
       |                                  |                     |
       |                            deepened/*.json             |
       |                                  |                     |
       |                            plan.json (final)           |
       |                                  |                     |
       +-------- validation.json ---------+-----> convergence   |
                                                   confirmed ===+
```

## Cumulative State

Each artifact builds on ALL prior artifacts. This is the key difference from a simple linear pipeline — later phases read **everything**, not just the immediate predecessor:

```
Phase     Reads                           Produces              New Knowledge
─────     ─────                           ────────              ─────────────
scan      project files                   analysis.json         what exists (facts)
research  prompt + analysis               requirements.json     what's needed (delta)
outline   analysis + requirements         outline.json          how to organize (structure)
decompose analysis + requirements +       epics/*.json          how to execute (steps)
          outline
merge     outline + epics/*               plan.json             cross-epic coherence
deepen    plan                            deepened/*.json        fine-grained steps
finalize  plan + deepened/*               plan.json (updated)   consolidated plan
validate  plan + requirements             validation.json       gap = 0 proof
emit      plan + validation               playbook.yml + tasks  executable files
```

The "Reads" column shows the interpolation pattern: each phase cross-references all relevant prior knowledge, not just the previous output.

All intermediate artifacts live in `.converge/plan-state/{name}/`.

## Phase 1: Scan

**Task id:** `001-scan`
**Input:** project directory
**Output:** `{stateDir}/analysis.json`
**Gap closed:** "We don't know what exists" -> "We have ground truth about the current state"

Establishes ground truth — the factual baseline that every subsequent phase builds on. No guessing, no user interaction. Read files and run commands to discover what actually exists.

### What to scan

- `package.json` — runtime, framework, dependencies
- `tsconfig.json` / build config — build tool, language settings
- Directory structure — top-level dirs, source file counts by type
- `git status` — uncommitted changes, recent commits
- Build status — does `npm run build` pass?
- Test status — how many tests pass/fail?
- Existing `.converge/` directory — prior playbooks, goals

### Output schema

```json
{
  "techStack": {
    "runtime": "node",
    "framework": "express",
    "language": "typescript",
    "build": "tsc",
    "styling": "tailwind",
    "packageManager": "npm"
  },
  "structure": {
    "sourceFiles": 42,
    "testFiles": 12,
    "keyDirectories": ["src/", "tests/", "docs/"]
  },
  "state": {
    "buildPasses": true,
    "testsPassing": 10,
    "testsFailing": 2,
    "lastCommit": "abc1234",
    "uncommittedChanges": 3
  },
  "patterns": {
    "naming": "camelCase files, PascalCase components",
    "stateManagement": "zustand",
    "apiStyle": "REST with Express Router"
  },
  "externalDeps": ["PostgreSQL", "Redis", "Stripe API"],
  "existingWork": ["auth module complete", "database schema exists"],
  "facts": ["FACT: project uses ESM — Source: package.json type field"]
}
```

### Checks

```yaml
checks:
  - id: analysis-exists
    cmd: test -f {stateDir}/analysis.json
  - id: analysis-valid
    cmd: 'node -e "JSON.parse(require(''fs'').readFileSync(''{stateDir}/analysis.json'',''utf-8''))"'
```

For fresh projects with no code, write minimal analysis with empty fields.

## Phase 2: Research

**Task id:** `002-research`
**Input:** `analysis.json` + user prompt
**Output:** `{stateDir}/requirements.json`
**Gap closed:** "We know what exists but not what's needed" -> "We know the delta between current and desired state"

This is where gap identification happens. Cross-reference the user's prompt against `analysis.json` to determine: what already exists (no work needed), what's partially done (extend), and what's entirely new (build). Each feature gets a status (`new` / `exists` / `partial`) that directly tells later phases where the gaps are.

Do NOT ask the user questions. Infer from the prompt and codebase context. If something is genuinely ambiguous, list it in `openQuestions`.

### Output schema

```json
{
  "vision": "One sentence: what we're building",
  "features": [
    {
      "name": "User authentication",
      "description": "JWT-based login with role-based access",
      "priority": "must",
      "status": "new"
    },
    {
      "name": "Database schema",
      "description": "PostgreSQL tables for users and sessions",
      "priority": "must",
      "status": "exists"
    }
  ],
  "constraints": [
    "Must use existing Express setup",
    "Cannot change database engine"
  ],
  "facts": [
    "FACT: Express 4.x is the HTTP framework — Source: package.json",
    "FACT: PostgreSQL 15 is the database — Source: docker-compose.yml"
  ],
  "openQuestions": ["Should sessions expire after 24h or 7d?"]
}
```

### Feature priorities

- `must` — required for the plan to be viable
- `should` — important but not blocking
- `nice` — include if complexity allows

### Feature statuses

- `new` — does not exist yet
- `exists` — already implemented
- `partial` — partially implemented

### Needs and Checks

```yaml
# needs — preconditions: verify analysis exists before starting research
needs:
  - id: analysis-ready
    cmd: test -f {stateDir}/analysis.json
    description: Analysis must be complete before research
  - id: analysis-valid
    cmd: 'node -e "JSON.parse(require(''fs'').readFileSync(''{stateDir}/analysis.json'',''utf-8''))"'
    description: Analysis must be valid JSON

# checks — postconditions: verify research output
checks:
  - id: requirements-exists
    cmd: test -f {stateDir}/requirements.json
  - id: requirements-valid
    cmd: 'node -e "JSON.parse(require(''fs'').readFileSync(''{stateDir}/requirements.json'',''utf-8''))"'
```

`needs` runs before execution — if `analysis.json` is missing or invalid, the task blocks immediately instead of wasting an execution cycle. `checks` runs after — proves the research output is valid.

## Phase 3a: Outline

**Task id:** `003-outline`
**Input:** `analysis.json` + `requirements.json`
**Output:** `{stateDir}/outline.json`
**Gap closed:** "We know what's needed but not how to organize the work" -> "Gaps are mapped to work packages (epics)"

Maps the gaps identified in `requirements.json` to work packages. Each epic covers a cluster of related gaps. The `complexity` estimate is itself a gap assessment — `complex` means "this epic contains gaps we can't fully see yet, needs further decomposition."

Does NOT decompose epics into tasks — that's delegated to per-epic subtasks in the decompose phase.

### Output schema

```json
{
  "name": "my-playbook",
  "description": "Build a REST API with auth and data layer",
  "pattern": "full-stack-app",
  "epics": [
    {
      "id": "01-foundation",
      "title": "Foundation",
      "description": "Project scaffolding, config, and dev tooling",
      "features": ["project-setup", "dev-environment"],
      "complexity": "simple",
      "dependencies": [],
      "needsWbs": false
    },
    {
      "id": "02-data-layer",
      "title": "Data Layer",
      "description": "Database schema, ORM setup, and migrations",
      "features": ["database-schema", "migrations"],
      "complexity": "medium",
      "dependencies": ["01-foundation"],
      "needsWbs": false
    }
  ],
  "facts": [],
  "apiNeeds": { "internal": [], "external": [] }
}
```

### Project patterns

Select the pattern that best matches the project:

| Pattern          | Typical epics                                                 |
| ---------------- | ------------------------------------------------------------- |
| `full-stack-app` | foundation, data-layer, api, frontend, auth, deployment       |
| `api`            | foundation, data-layer, endpoints, auth, testing              |
| `cli`            | foundation, core-commands, config, output-formatting, testing |
| `data-pipeline`  | foundation, ingestion, transformation, output, monitoring     |
| `static-site`    | foundation, content, components, styling, deployment          |
| `mobile`         | foundation, navigation, screens, data, platform-specific      |

### Complexity estimates

- `simple` — 2-3 straightforward tasks, no WBS needed
- `medium` — 4-5 tasks, some interdependencies
- `complex` — 6-7 tasks, may need WBS for repeated patterns

### Needs and Checks

```yaml
# needs — verify interpolation inputs exist
needs:
  - id: analysis-ready
    cmd: test -f {stateDir}/analysis.json
    description: Analysis (ground truth) must exist
  - id: requirements-ready
    cmd: test -f {stateDir}/requirements.json
    description: Requirements (gap analysis) must exist

# checks — verify interpolation output
checks:
  - id: outline-exists
    cmd: test -f {stateDir}/outline.json
  - id: outline-has-epics
    cmd: 'node -e "const o=JSON.parse(require(''fs'').readFileSync(''{stateDir}/outline.json'',''utf-8''));if(!o.epics||!o.epics.length)throw new Error(''no epics'')"'
  - id: outline-epics-have-deps
    cmd: 'node -e "const o=JSON.parse(require(''fs'').readFileSync(''{stateDir}/outline.json'',''utf-8''));o.epics.forEach(e=>{if(!Array.isArray(e.dependencies))throw new Error(e.id+'' missing deps'')})"'
```

The `needs` checks verify that all prior interpolation outputs exist before this phase starts. If `analysis.json` or `requirements.json` is missing, the outline phase blocks immediately instead of producing a bad result.

## Phase 3b: Decompose (WBS)

**Task id:** `003-decompose`
**Type:** WBS parent — spawns one subtask per epic
**Gap closed:** "We know the work packages but not the executable steps" -> "Each gap is decomposed into tasks with specific outputs and checks"

This is where gap-driven decomposition happens. Each epic is a cluster of gaps; the decompose phase breaks each one into concrete tasks where every task closes a specific, verifiable gap. The WBS pattern is itself an application of the enrichment principle: the outline is too coarse to execute, so we spawn one subtask per epic to enrich each one independently.

### Needs (parent task)

```yaml
needs:
  - id: outline-ready
    cmd: test -f {stateDir}/outline.json
    description: Outline must exist before decomposition
  - id: outline-has-epics
    cmd: 'node -e "const o=JSON.parse(require(''fs'').readFileSync(''{stateDir}/outline.json'',''utf-8''));if(!o.epics.length)throw ''empty''"'
    description: Outline must have epics to decompose
```

### How it works

1. WBS script reads `outline.json`
2. Loops over `epics` array
3. For each epic, calls `ctx.spawn()` with:
   - id: `003-{padded-index}-{epic.id}` (e.g., `003-001-01-foundation`)
   - inputs: `outline.json`, `requirements.json`, `analysis.json`
   - output: `{stateDir}/epics/{epic.id}.json`
   - needs: outline and requirements exist (inherited from parent)
   - checks: output exists and is valid JSON with non-empty `tasks` array
   - body: instructions to decompose the epic into tasks

### WBS script pattern

See `decompose-epics-wbs.js` for the canonical example:

```javascript
import { readFileSync } from "fs";
import { join } from "path";

export async function run(ctx) {
  const stateDir = `.converge/plan-state/${ctx.vars?.name || "default"}`;
  const outline = JSON.parse(
    readFileSync(join(ctx.projectDir, stateDir, "outline.json"), "utf-8"),
  );

  let prevId = null;
  for (let i = 0; i < outline.epics.length; i++) {
    const epic = outline.epics[i];
    const padded = String(i + 1).padStart(3, "0");
    const taskId = `003-${padded}-${epic.id}`;
    const outputPath = `${stateDir}/epics/${epic.id}.json`;

    await ctx.spawn({
      id: taskId,
      title: `Decompose epic: ${epic.title}`,
      dependencies: prevId ? [prevId] : [],
      inputs: [`${stateDir}/outline.json`, `${stateDir}/requirements.json`],
      outputs: [outputPath],
      skills: ["converge-planning"],
      checks: [
        { id: `${epic.id}-exists`, cmd: `test -f ${outputPath}` },
        {
          id: `${epic.id}-valid`,
          cmd: `node -e "const e=JSON.parse(require('fs').readFileSync('${outputPath}','utf-8'));if(!e.tasks||!e.tasks.length)throw 'no tasks'"`,
        },
      ],
      body: `Decompose epic "${epic.title}" into 3-7 tasks...`,
    });
    prevId = taskId;
  }
}
```

### Per-epic output schema

Each subtask writes `{stateDir}/epics/{epic.id}.json`:

```json
{
  "id": "02-data-layer",
  "title": "Data Layer",
  "description": "Database schema, ORM setup, and migrations",
  "dependencies": ["01-foundation"],
  "wbs": false,
  "tasks": [
    {
      "id": "001-schema",
      "title": "Create database schema",
      "description": "Define PostgreSQL tables",
      "dependencies": [],
      "inputs": [],
      "outputs": ["src/db/schema.sql"],
      "checks": [{ "id": "schema-exists", "cmd": "test -f src/db/schema.sql" }],
      "body": "Create the PostgreSQL schema..."
    }
  ],
  "needsDeepening": []
}
```

If a task is too complex (e.g., "generate 12 API endpoints"), it represents a **gap in specificity** — flag it for further decomposition:

```json
"needsDeepening": [
  {
    "taskId": "003-api-endpoints",
    "reason": "12 endpoints to generate — should be WBS",
    "items": ["GET /users", "POST /users", "GET /users/:id"]
  }
]
```

`needsDeepening` is the mechanism for recognizing that enrichment is incomplete — this task is still too coarse to execute and needs another round of decomposition.

## Phase 3c: Merge

**Task id:** `003-merge`
**Input:** `outline.json` + `epics/*.json`
**Output:** `{stateDir}/plan.json`
**Gap closed:** "We have per-epic plans but no unified view" -> "Cross-epic gaps are identified and dependencies resolved"

Merging is an interpolation step: per-epic plans are developed in isolation, so cross-epic gaps (missing dependencies, duplicate outputs, unresolved references) only become visible when you merge. This phase cross-references all epics against each other and against the original requirements.

### Needs

```yaml
needs:
  - id: outline-ready
    cmd: test -f {stateDir}/outline.json
    description: Outline needed for epic ordering
  - id: epics-decomposed
    cmd: "[ $(ls {stateDir}/epics/*.json 2>/dev/null | wc -l) -ge 1 ]"
    description: At least one epic decomposition must exist
```

### Merge logic

- Read `outline.json` for epic ordering and metadata
- Read each `epics/{id}.json` for task details
- **Cross-reference I/O chains**: if epic B's task reads a file that epic A's task produces, add the cross-epic dependency
- **Detect duplicate outputs**: two tasks producing the same file is a conflict — resolve by merging or reordering
- **Verify input coverage**: every task input must trace back to a prior task's output or an existing file
- Aggregate all `needsDeepening` flags into a top-level array — these are gaps that remain open

### Output schema

```json
{
  "name": "my-playbook",
  "description": "Build a REST API with auth and data layer",
  "pattern": "full-stack-app",
  "epics": [
    {
      "id": "01-foundation",
      "title": "Foundation",
      "description": "...",
      "dependencies": [],
      "wbs": false,
      "tasks": [...]
    }
  ],
  "facts": [],
  "apiNeeds": { "internal": [], "external": [] },
  "wbsSummary": [],
  "needsDeepening": []
}
```

### Checks

```yaml
checks:
  - id: plan-exists
    cmd: test -f {stateDir}/plan.json
  - id: plan-has-epics
    cmd: 'node -e "const p=JSON.parse(require(''fs'').readFileSync(''{stateDir}/plan.json'',''utf-8''));if(!p.epics||!p.epics.length)throw ''no epics''"'
```

## Phase 3d: Deepen (Conditional WBS)

**Task id:** `003-deepen`
**Type:** WBS parent — conditional, spawns only if needed
**Gap closed:** "Some tasks are too coarse to execute" -> "All tasks are at executable granularity"

This is the recursive interpolation step. The merge phase may reveal tasks that are still too coarse — each one is a gap in specificity. Deepening closes these gaps by spawning one subtask per oversized task to decompose it further.

If `needsDeepening` is empty, all gaps are already at executable granularity — zero subtasks are spawned and the pipeline continues.

### Needs

```yaml
needs:
  - id: plan-merged
    cmd: test -f {stateDir}/plan.json
    description: Merged plan must exist before deepening
  - id: plan-valid
    cmd: 'node -e "JSON.parse(require(''fs'').readFileSync(''{stateDir}/plan.json'',''utf-8''))"'
    description: Plan must be valid JSON
```

### WBS script pattern

See `deepen-tasks-wbs.js` for the canonical example:

```javascript
import { readFileSync } from "fs";
import { join } from "path";

export async function run(ctx) {
  const stateDir = `.converge/plan-state/${ctx.vars?.name || "default"}`;
  const plan = JSON.parse(
    readFileSync(join(ctx.projectDir, stateDir, "plan.json"), "utf-8"),
  );

  const toDeepen = plan.needsDeepening || [];
  if (toDeepen.length === 0) return; // nothing to do

  let prevId = null;
  for (let i = 0; i < toDeepen.length; i++) {
    const item = toDeepen[i];
    const padded = String(i + 1).padStart(3, "0");
    const taskId = `003-d-${padded}-${item.epicId}-${item.taskId}`;
    const outputPath = `${stateDir}/deepened/${item.epicId}-${item.taskId}.json`;

    await ctx.spawn({
      id: taskId,
      title: `Sub-decompose: ${item.epicId}/${item.taskId}`,
      dependencies: prevId ? [prevId] : [],
      inputs: [`${stateDir}/plan.json`],
      outputs: [outputPath],
      checks: [
        { id: `deep-${padded}-exists`, cmd: `test -f ${outputPath}` },
        {
          id: `deep-${padded}-valid`,
          cmd: `node -e "JSON.parse(require('fs').readFileSync('${outputPath}','utf-8'))"`,
        },
      ],
      body: `Sub-decompose task ${item.taskId} in epic ${item.epicId}...`,
    });
    prevId = taskId;
  }
}
```

### Deepening output schema

Each subtask writes `{stateDir}/deepened/{epicId}-{taskId}.json`:

```json
{
  "epicId": "03-api",
  "parentTaskId": "003-api-endpoints",
  "replaceWith": "wbs",
  "subtasks": [
    {
      "id": "001-get-users",
      "title": "GET /users endpoint",
      "outputs": ["src/routes/users/list.ts"],
      "checks": [
        { "id": "list-exists", "cmd": "test -f src/routes/users/list.ts" }
      ],
      "body": "Implement the GET /users endpoint..."
    }
  ],
  "wbsItems": ["GET /users", "POST /users", "GET /users/:id"]
}
```

- `replaceWith: "wbs"` — all subtasks follow the same template (generate a `wbs.js`)
- `replaceWith: "inline"` — subtasks are heterogeneous (expand as regular tasks)

## Phase 3e: Finalize

**Task id:** `003-finalize`
**Input:** `plan.json` + `deepened/*.json`
**Output:** `{stateDir}/plan.json` (updated)
**Gap closed:** "Deepened results exist separately" -> "All enrichment is consolidated into one plan"

Consolidates all interpolation results into a single artifact.

### Needs

```yaml
needs:
  - id: plan-exists
    cmd: test -f {stateDir}/plan.json
    description: Merged plan must exist before finalization
```

### Finalize logic

- If `deepened/` has files: replace oversized tasks with their sub-decompositions, update dependency chains, re-verify I/O chain integrity
- If `deepened/` is empty or missing: plan is already at the right granularity — copy as-is
- Set `needsDeepening` to `[]`
- Re-check all cross-epic dependencies are still valid after substitution

### Checks

```yaml
checks:
  - id: plan-finalized
    cmd: test -f {stateDir}/plan.json
  - id: no-pending-deepening
    cmd: 'node -e "const p=JSON.parse(require(''fs'').readFileSync(''{stateDir}/plan.json'',''utf-8''));if(p.needsDeepening&&p.needsDeepening.length)throw ''still has pending''"'
```

After finalizing, no task should be flagged as needing further decomposition. The plan is at full resolution — every task is executable, every gap is either closed or represented as a task that will close it.

## Phase 4: Validate

**Task id:** `004-validate`
**Input:** `plan.json` + `requirements.json`
**Output:** `{stateDir}/validation.json`
**Gap closed:** "We have a plan but don't know if it's complete" -> "Proven: gap = 0, every requirement covered, every chain intact"

Validation is the convergence check — it proves that the interpolation process has closed all gaps. It reads the final `plan.json` AND the original `requirements.json` to verify end-to-end coverage.

### Needs

```yaml
needs:
  - id: plan-finalized
    cmd: test -f {stateDir}/plan.json
    description: Finalized plan must exist
  - id: plan-no-pending-deepening
    cmd: 'node -e "const p=JSON.parse(require(''fs'').readFileSync(''{stateDir}/plan.json'',''utf-8''));if(p.needsDeepening&&p.needsDeepening.length)throw ''pending''"'
    description: All deepening must be resolved before validation
  - id: requirements-ready
    cmd: test -f {stateDir}/requirements.json
    description: Requirements needed for coverage check
```

### Validation checks

Each check targets a specific type of gap:

| Check                   | Gap it detects                                            |
| ----------------------- | --------------------------------------------------------- |
| Structural completeness | Tasks missing outputs or checks (unverifiable work)       |
| Task quality            | Tasks too vague to execute (specificity gap)              |
| Dependency integrity    | Broken or circular references (ordering gap)              |
| I/O chain               | Inputs not produced by any prior task (information gap)   |
| Requirements coverage   | `must` features with no corresponding task (coverage gap) |
| Facts documented        | Assumptions not grounded in evidence (knowledge gap)      |
| Sizing                  | Epics with 7+ tasks or tasks too coarse (granularity gap) |

### Output schema

```json
{
  "valid": true,
  "checks": {
    "structuralCompleteness": {
      "pass": true,
      "details": "All 5 epics have tasks"
    },
    "taskQuality": {
      "pass": true,
      "details": "23 tasks, all with outputs and checks"
    },
    "dependencyIntegrity": {
      "pass": true,
      "details": "No circular deps, all refs valid"
    },
    "inputOutputChain": {
      "pass": true,
      "details": "All inputs traced to prior outputs"
    },
    "requirementsCoverage": {
      "pass": true,
      "details": "8/8 must features covered"
    },
    "factsDocumented": { "pass": true, "details": "5 facts documented" },
    "sizing": { "pass": true, "details": "Max 6 tasks per epic" }
  },
  "errors": [],
  "warnings": [
    "Epic 04-testing has only 2 tasks — consider merging into another epic"
  ],
  "summary": "Plan has 5 epics, 23 tasks, covers all must-have requirements"
}
```

### Checks

```yaml
checks:
  - id: validation-exists
    cmd: test -f {stateDir}/validation.json
  - id: validation-passes
    cmd: 'node -e "const v=JSON.parse(require(''fs'').readFileSync(''{stateDir}/validation.json'',''utf-8''));if(!v.valid)throw v.errors.join('', '')"'
```

If validation fails, fix the issues in `plan.json` and re-validate. Do not proceed to emit until validation passes.

## Phase 5: Emit

**Task id:** `005-emit`
**Input:** `plan.json` + `validation.json`
**Output:** `.converge/playbooks/{name}/playbook.yml` + task tree
**Gap closed:** "We have a validated plan but it's not executable" -> "Plan materialized as runnable playbook files"

Converts the validated plan into runnable playbook files. This is the final interpolation step: all accumulated knowledge is materialized into concrete, executable files where each TASK.md encodes inputs, outputs, needs, dependencies, and checks — the full information contract needed for autonomous execution.

### Needs

```yaml
needs:
  - id: plan-ready
    cmd: test -f {stateDir}/plan.json
    description: Finalized plan must exist
  - id: validation-passed
    cmd: 'node -e "const v=JSON.parse(require(''fs'').readFileSync(''{stateDir}/validation.json'',''utf-8''));if(!v.valid)throw v.errors[0]"'
    description: Plan must be validated before emission
```

### What to generate

1. `playbook.yml` — top-level config from plan metadata
2. Epic directories — `tasks/NN-epic-name/TASK.md` for each epic
3. Task directories — `tasks/NN-epic/tasks/NNN-task/TASK.md` for each task
4. WBS scripts — `wbs.js` for epics marked with `wbs: true`
5. Goals — `goals/NNN-name/GOAL.md` if the project has build/test goals

### Output structure

```
.converge/playbooks/{name}/
├── playbook.yml
└── tasks/
    ├── 01-foundation/
    │   ├── TASK.md
    │   └── tasks/
    │       ├── 001-init-project/
    │       │   └── TASK.md
    │       └── 002-dev-tooling/
    │           └── TASK.md
    ├── 02-data-layer/
    │   ├── TASK.md
    │   └── tasks/
    │       ├── 001-schema/
    │       │   └── TASK.md
    │       └── 002-migrations/
    │           └── TASK.md
    └── 03-api/
        ├── TASK.md
        └── wbs.js               # for WBS epics
```

### Checks

```yaml
checks:
  - id: playbook-yml-exists
    cmd: test -f .converge/playbooks/{name}/playbook.yml
  - id: has-tasks
    cmd: test -d .converge/playbooks/{name}/tasks
```

After emission, print a summary: number of epics and tasks created, playbook location, and how to run it (`converge run --playbook={name}`).
