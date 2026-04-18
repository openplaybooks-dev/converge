# Task Format Reference

Format specification for `playbook.yml` and `TASK.md` files.

## playbook.yml

Top-level playbook configuration file. Lives at `.converge/playbooks/{name}/playbook.yml`.

```yaml
name: my-playbook
description: What this playbook builds

run:
  mode: autonomous # autonomous | stepped
  maxIterations: 50 # max converge cycles
  maxTaskAttempts: 3 # max retries per failing task
  resume: true # resume from last checkpoint

inputs: # playbook-level inputs
  - prompt # available as ${prompt} in tasks

key: prompt # cache key for idempotent runs

checks: # playbook-level checks (all must pass to complete)
  - id: builds-clean
    cmd: npm run build
    description: Project builds without errors
```

| Field                 | Type       | Required | Description                            |
| --------------------- | ---------- | -------- | -------------------------------------- |
| `name`                | string     | yes      | Playbook identifier                    |
| `description`         | string     | yes      | What the playbook does                 |
| `run.mode`            | string     | no       | `autonomous` (default) or `stepped`    |
| `run.maxIterations`   | number     | no       | Max converge cycles (default: 50)      |
| `run.maxTaskAttempts` | number     | no       | Max retries per task (default: 3)      |
| `run.resume`          | boolean    | no       | Resume from checkpoint (default: true) |
| `inputs`              | string[]   | no       | Named inputs passed at invocation      |
| `key`                 | string     | no       | Input field used as cache key          |
| `checks`              | CheckDef[] | no       | Playbook-level completion checks       |

## TASK.md Format

Each task is a directory containing a `TASK.md` file with YAML frontmatter and a markdown body.

```yaml
---
id: 001-setup-database
title: Set up database schema
description: Create PostgreSQL schema with user and session tables
dependencies:
  - 001-init-project
inputs:
  - src/config/database.ts
outputs:
  - src/db/schema.sql
  - src/db/migrations/001-initial.sql
checks:
  - id: schema-exists
    cmd: test -f src/db/schema.sql
    description: Schema file created
  - id: schema-valid
    cmd: 'node -e "require(''fs'').readFileSync(''src/db/schema.sql'',''utf-8'')"'
    description: Schema file is readable
---
# Set Up Database Schema

Create the initial database schema for the application.

1. Read the data model from `src/config/database.ts`
2. Generate a PostgreSQL schema with tables for users and sessions
3. Write migration file at `src/db/migrations/001-initial.sql`
4. Include indexes on frequently queried columns
```

The markdown body below the frontmatter becomes the AI prompt — the instructions the AI executor follows to complete the task.

## TASK.md Frontmatter Fields

Every field from the `TaskMdDef` interface:

| Field               | Type               | Required | Description                                                  |
| ------------------- | ------------------ | -------- | ------------------------------------------------------------ |
| `id`                | string             | no       | Task identifier (usually derived from directory name)        |
| `name`              | string             | no       | Task name (alternative to id)                                |
| `title`             | string             | yes      | Human-readable task title                                    |
| `description`       | string             | no       | One-line summary of what the task does                       |
| `dependencies`      | string[]           | no       | Task ids that must complete before this one                  |
| `requires`          | string[]           | no       | Required capabilities or preconditions                       |
| `inputs`            | string[]           | no       | File paths this task reads                                   |
| `outputs`           | string[]           | no       | File paths this task produces                                |
| `checks`            | CheckDef[]         | no       | Postcondition checks — run after execution, validate outputs |
| `needs`             | CheckDef[]         | no       | Precondition checks — run before execution, block if failed  |
| `skills`            | string[]           | no       | Converge skills this task requires                           |
| `agent`             | string             | no       | AI agent/model to use for execution                          |
| `executor`          | TaskMdExecutor     | no       | Custom executor config (type: ai/script/function)            |
| `wbs`               | TaskMdWbs          | no       | Work breakdown structure config for spawning subtasks        |
| `plan`              | TaskMdPlan         | no       | Planning config (prompt, output, outputPrompt)               |
| `blocking`          | boolean            | no       | If true, all downstream tasks wait for this one              |
| `tags`              | string[]           | no       | Metadata tags for filtering and grouping                     |
| `vars`              | object             | no       | Custom variables passed to the task context                  |
| `materials`         | string[]           | no       | File paths to load as context for the AI                     |
| `allowed-tools`     | string[]           | no       | Restrict which tools the AI can use                          |
| `diagnosis-hints`   | DiagnosisHint[]    | no       | Hints for diagnosing failures                                |
| `correction-budget` | number             | no       | Max correction attempts before failing                       |
| `context-depth`     | number             | no       | How many ancestor contexts to include                        |
| `auto-converge`     | boolean/object     | no       | Auto-convergence policy                                      |
| `context`           | SkillContextStep[] | no       | Steps to build context before execution                      |
| `backlogs`          | BacklogDef[]       | no       | Backlog items to track during execution                      |
| `goals`             | string[]           | no       | Goal ids this task contributes to                            |

Additional fields available on `TaskMdShape` (the `ctx.spawn()` currency):

| Field      | Type      | Description                                   |
| ---------- | --------- | --------------------------------------------- |
| `goalDefs` | GoalDef[] | Goal definitions produced when task completes |
| `body`     | string    | Markdown body (AI prompt)                     |
| `prompt`   | string    | Alias for body (backward compat)              |

### `needs` vs `checks`

Both use the same `CheckDef` format, but run at different times:

```
  needs (preconditions)          task execution          checks (postconditions)
  ─────────────────────          ──────────────          ──────────────────────
  Run BEFORE the task.           The actual work.        Run AFTER the task.
  All must pass or the           AI executes the         All must pass or the
  task is blocked.               body prompt.            task is marked failed.
```

Use `needs` to verify that upstream outputs exist and are valid before this task starts. This prevents wasted execution — if a precondition fails, the task doesn't run at all.

Use `checks` to verify that this task's own outputs are correct after execution.

```yaml
# needs — preconditions (run before execution)
needs:
  - id: schema-ready
    cmd: test -f src/db/schema.sql
    description: Database schema must exist before migration
  - id: config-valid
    cmd: 'node -e "JSON.parse(require(''fs'').readFileSync(''config.json'',''utf-8''))"'
    description: Config file must be valid JSON

# checks — postconditions (run after execution)
checks:
  - id: migration-exists
    cmd: test -f src/db/migrations/001-initial.sql
    description: Migration file created
  - id: migration-valid
    cmd: 'node -e "JSON.parse(require(''fs'').readFileSync(''src/db/migrations/001-initial.sql'',''utf-8''))"'
    description: Migration is valid
```

### Sub-type: CheckDef

Used by both `needs` and `checks`:

```yaml
- id: unique-check-id # required — identifies this check
  cmd: test -f output.json # shell command, exit 0 = pass
  description: Output file exists # human-readable explanation
```

### Sub-type: WbsDef

```yaml
wbs:
  type: nodejs # nodejs | shell | ai
  path: ./wbs.js # script path (nodejs/shell)
  prompt: | # AI prompt (type: ai only)
    Read data and spawn subtasks...
  maxAttempts: 3 # max AI generation attempts (type: ai only)
```

### Sub-type: PlanDef

```yaml
plan:
  prompt: Analyze and create a plan for...
  output: plan.json
  outputPrompt: Format the plan as JSON...
```

### Sub-type: ExecutorDef

```yaml
executor:
  type: script # ai | script | function
  path: ./run.sh
  args: [--verbose]
  env:
    NODE_ENV: production
```

### Sub-type: GoalDef

Used by `goalDefs` in `TaskMdShape` (ctx.spawn). When a task with goalDefs completes, each entry becomes a `.converge/goals/{NNN}-{id}/GOAL.md` file.

```yaml
goalDefs:
  - id: builds-clean
    title: Project builds without errors
    metric:
      cmd: npm run build
      target: 0 # target value for the metric
      direction: min # min | max
    depends: [deps-installed]
    requirements: "Build must complete in under 60s"
    tags: [critical]
    plan:
      strategy: single # split | single | custom | wbs
```

| Field              | Type     | Required | Description                           |
| ------------------ | -------- | -------- | ------------------------------------- |
| `id`               | string   | yes      | Goal identifier                       |
| `title`            | string   | yes      | Human-readable title                  |
| `metric.cmd`       | string   | no       | Shell command to measure              |
| `metric.script`    | string   | no       | Script path to measure                |
| `metric.target`    | number   | yes      | Target value                          |
| `metric.direction` | string   | yes      | `min` or `max`                        |
| `depends`          | string[] | no       | Goal ids this depends on              |
| `requirements`     | string   | no       | Requirements text                     |
| `tags`             | string[] | no       | Tags for filtering                    |
| `plan.strategy`    | string   | no       | `split`, `single`, `custom`, or `wbs` |
| `body`             | string   | no       | Goal description markdown             |
| `dod`              | string   | no       | dod.js script content                 |
| `wbs`              | string   | no       | wbs.js script content                 |

### Sub-type: BacklogDef

Backlog scans — commands whose output produces backlog items tracked during execution.

```yaml
backlogs:
  - id: lint-warnings
    cmd: "npx eslint src/ --format compact 2>&1 | grep warning || true"
    description: ESLint warnings to fix
    severity: medium # low | medium | high
```

| Field         | Type   | Required | Description                                             |
| ------------- | ------ | -------- | ------------------------------------------------------- |
| `id`          | string | yes      | Backlog category identifier                             |
| `cmd`         | string | yes      | Shell command — each stdout line becomes a backlog item |
| `description` | string | no       | Human-readable category description                     |
| `severity`    | string | no       | `low`, `medium`, or `high`                              |

### Sub-type: DiagnosisHint

Pattern-based failure hints — matched before calling AI for diagnosis. Reduces diagnostic latency by providing deterministic rules for common failures.

```yaml
diagnosis-hints:
  - id: missing-dep
    pattern: "Cannot find module"
    errorClass: dependency-missing
    cause: "A required npm package is not installed"
    fix: "Run npm install to install missing dependencies"
    automatable: true
```

| Field         | Type    | Required | Description                                                                                                    |
| ------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `id`          | string  | yes      | Hint identifier                                                                                                |
| `pattern`     | string  | yes      | Substring or regex to match against check output                                                               |
| `errorClass`  | string  | yes      | `timeout`, `missing-output`, `check-failed`, `corrupted-output`, `dependency-missing`, `tool-error`, `unknown` |
| `cause`       | string  | yes      | Human-readable cause description                                                                               |
| `fix`         | string  | yes      | Suggested fix description                                                                                      |
| `automatable` | boolean | yes      | Whether the fix can be applied automatically                                                                   |

### Sub-type: AutoConvergePolicy

Controls how auto-converge enriches TASK.md frontmatter before execution. Set `auto-converge: true` for defaults, or provide a full policy.

```yaml
# Simple — use defaults (AI mode, enrich inputs/outputs/checks)
auto-converge: true

# Full policy
auto-converge:
  mode: ai              # ai | script
  script: ./enrich.sh   # for mode: script — must print YAML to stdout
  enrich:               # which fields to auto-fill
    - inputs
    - outputs
    - checks
    - diagnosis-hints
  overwrite: false       # overwrite existing values? (default: false)
```

### Sub-type: SkillContextStep

Context declarations — what context a task needs before execution. The framework gathers declared context and writes it to the attempt directory before invoking the task.

```yaml
context:
  # Extract fields from gap metadata (zero cost)
  - type: gap
    fields: [checkCmd, checkOutput]

  # Run a shell command, capture stdout
  - type: cmd
    cmd: "cat package.json | jq .dependencies"
    label: project-deps

  # Read a specific file
  - type: file
    path: "{attemptDir}/TASK.md"
    label: task-definition
    optional: false

  # Glob for files, list matches
  - type: files
    pattern: "src/**/*.ts"
    label: source-files
    maxFiles: 50

  # Ask AI a question
  - type: ai
    prompt: "Analyze the error and identify root cause: {checkOutput}"
    label: root-cause
    tools: [Read, Glob]
    timeoutMs: 30000
```

Template variables replaced at runtime: `{checkCmd}`, `{checkOutput}`, `{inputPattern}`, `{taskId}`, `{attemptDir}`, `{projectDir}`.

## Automatic `vars` Collection

Any frontmatter key that is NOT a reserved field is automatically collected into `vars`. This means you can add custom data directly in frontmatter:

```yaml
---
title: Generate API routes
# Reserved fields (handled by the framework):
inputs: [src/models/*.ts]
outputs: [src/routes/*.ts]
# Custom fields (automatically collected into vars):
apiVersion: v2
baseUrl: /api
routePrefix: admin
---
```

The task can access these as `ctx.vars.apiVersion`, `ctx.vars.baseUrl`, etc.

## Check Patterns

Deterministic checks for common validation scenarios:

| Pattern             | Command                                                                                                     | Use when                |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------- |
| File exists         | `test -f path/to/file`                                                                                      | Any file output         |
| Non-empty           | `test -s path/to/file`                                                                                      | File must have content  |
| Valid JSON          | `node -e "JSON.parse(require('fs').readFileSync('path','utf-8'))"`                                          | JSON output             |
| JSON has field      | `node -e "const d=JSON.parse(require('fs').readFileSync('path','utf-8'));if(!d.field)throw 'missing'"`      | Required JSON field     |
| Array non-empty     | `node -e "const d=JSON.parse(require('fs').readFileSync('path','utf-8'));if(!d.items.length)throw 'empty'"` | JSON array output       |
| TypeScript compiles | `npx tsc --noEmit`                                                                                          | TypeScript source files |
| Tests pass          | `npm test`                                                                                                  | Test files              |
| File count          | `[ $(ls path/*.json \| wc -l) -ge 3 ]`                                                                      | Multiple file outputs   |

Always use at least the "file exists" check. Layer additional checks for stronger validation.

## Dependency Formats

```yaml
# Same-epic dependency (task in the same epic)
dependencies:
  - 001-setup

# Cross-epic dependency (task in a different epic)
dependencies:
  - 01-foundation.001-setup

# Tag-based dependency (all tasks with this tag)
dependencies:
  - tag:critical
```

## Directory Layout

```
.converge/playbooks/{name}/
├── playbook.yml
└── tasks/
    ├── 01-epic-name/
    │   ├── TASK.md              # epic-level task (or WBS parent)
    │   └── tasks/
    │       ├── 001-task-name/
    │       │   └── TASK.md
    │       └── 002-task-name/
    │           └── TASK.md
    └── 02-epic-name/
        ├── TASK.md
        ├── wbs.js               # WBS script (when spawning subtasks dynamically)
        └── tasks/
            └── 001-task-name/
                └── TASK.md
```

- Epic directories: `NN-kebab-case` (two-digit prefix)
- Task directories: `NNN-kebab-case` (three-digit prefix)
- Each directory contains exactly one `TASK.md`
- `wbs.js` sits next to `TASK.md` in the parent task directory

## Complete Example

A fully annotated `TASK.md` with all common fields:

```yaml
---
id: 003-implement-auth
title: Implement authentication middleware
description: Add JWT-based auth middleware to Express routes
dependencies:
  - 001-setup-project
  - 02-database.001-user-table
inputs:
  - src/config/auth.ts
  - src/db/schema.sql
outputs:
  - src/middleware/auth.ts
  - src/middleware/auth.test.ts
  - src/routes/login.ts
checks:
  - id: auth-middleware-exists
    cmd: test -f src/middleware/auth.ts
    description: Auth middleware file created
  - id: auth-tests-exist
    cmd: test -f src/middleware/auth.test.ts
    description: Auth test file created
  - id: auth-compiles
    cmd: npx tsc --noEmit src/middleware/auth.ts
    description: Auth middleware compiles
  - id: auth-tests-pass
    cmd: npx jest src/middleware/auth.test.ts
    description: Auth tests pass
skills:
  - converge-planning
tags:
  - auth
  - critical
vars:
  jwtSecret: ${JWT_SECRET}
  tokenExpiry: 24h
---

# Implement Authentication Middleware

Create JWT-based authentication for the Express API.

## Steps

1. Read the auth config from `src/config/auth.ts` for token settings
2. Create `src/middleware/auth.ts`:
   - Export `authenticate` middleware that validates JWT tokens
   - Export `authorize(roles)` middleware for role-based access
   - Handle token expiry with 401 response
3. Create `src/routes/login.ts`:
   - POST /login — validate credentials, return JWT
   - POST /refresh — refresh expired token
4. Write tests in `src/middleware/auth.test.ts`:
   - Test valid token passes
   - Test expired token returns 401
   - Test missing token returns 401
   - Test role-based authorization
```
