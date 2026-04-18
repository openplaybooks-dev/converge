# Playbook Scaffolding

How to create, structure, and customize Converge playbooks.

## Quick scaffold

Initialize a project and create your first playbook:

```bash
# Initialize a converge project
converge init --name="My Project"

# Run a playbook
converge run --playbook=my-playbook
```

This creates the `.converge/` directory structure. Playbooks live under `.converge/playbooks/<name>/`.

A minimal playbook requires two things:

```
.converge/playbooks/my-playbook/
├── playbook.yml              # Playbook definition
└── tasks/
    └── 01-do-thing/
        └── TASK.md           # Task instructions
```

**playbook.yml**:
```yaml
name: my-playbook
description: What this playbook does

run:
  mode: autonomous
```

**tasks/01-do-thing/TASK.md**:
```markdown
---
title: Do the thing
checks:
  - id: thing-done
    cmd: test -f output.txt
---

Create output.txt with the result.
```

Run it: `converge run --playbook=my-playbook`

## Playbook anatomy

### playbook.yml

The root configuration file. Fields:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Unique playbook identifier |
| `description` | yes | Human-readable description |
| `run` | no | Execution settings |
| `inputs` | no | Input variables (see [Templates](#templates)) |
| `key` | no | Input field used to generate unique epic IDs |
| `checks` | no | Post-run validation commands |

**`run` options**:
```yaml
run:
  mode: autonomous        # autonomous | converge | step
  maxIterations: 50       # Max convergence loops
  maxTaskAttempts: 3      # Max retries per task
  maxDuration: 60m        # Time limit (e.g., 30m, 2h, infinite)
  resume: true            # Resume from last checkpoint
```

**`checks`** define validation commands run after execution:
```yaml
checks:
  - id: builds-clean
    cmd: npm run build
    description: Build succeeds
  - id: tests-pass
    cmd: npm test
    description: Tests pass
```

### TASK.md

Each task lives in its own directory under `tasks/`. The file has YAML frontmatter and a Markdown body:

```markdown
---
title: Project Setup
checks:
  - id: package-json
    cmd: test -f package.json
  - id: tsconfig
    cmd: test -f tsconfig.json
---

Initialize the project:

1. Create package.json with TypeScript and React
2. Create tsconfig.json with strict mode
3. Verify `npm install` succeeds
```

**Frontmatter fields**:

| Field | Description |
|-------|-------------|
| `title` | Human-readable task name |
| `dependencies` | List of task IDs that must complete first |
| `inputs` | Required input files (glob supported) |
| `outputs` | Expected output files (glob supported) |
| `checks` | Validation commands for this task |
| `skills` | Skills to load for the AI agent |
| `wbs` | Work breakdown structure config (see below) |

The Markdown body is the prompt sent to the AI agent.

### wbs.js

A WBS (Work Breakdown Structure) script dynamically generates child tasks. Referenced from TASK.md:

```yaml
---
title: Build Components
wbs:
  type: nodejs
  path: ./wbs.js
---
```

The script exports an async `run` function:

```javascript
export async function run(ctx) {
  await ctx.spawn({
    id: '001-first-task',
    title: 'First task',
    body: 'Instructions for the agent...',
  });

  await ctx.spawn({
    id: '002-second-task',
    title: 'Second task',
    dependencies: ['001-first-task'],
    checks: [
      { id: 'output-exists', cmd: 'test -f result.json' }
    ],
    body: 'More instructions...',
  });
}
```

**`ctx.spawn()` fields**: `id`, `title`, `body`, `dependencies`, `inputs`, `outputs`, `checks`.

### GOAL.md

Optional convergence goals live under `goals/`:

```
.converge/playbooks/my-playbook/
└── goals/
    └── 001-builds-clean/
        └── GOAL.md
```

```markdown
---
id: builds-clean
weight: 10
---

# Builds Clean

The project must build without errors.
```

## Templates

### Simple sequential

A fixed set of tasks that run in order. Good for repeatable workflows.

```
.converge/playbooks/default/
├── playbook.yml
├── tasks/
│   ├── 01-setup/TASK.md
│   ├── 02-build/TASK.md
│   └── 03-test/TASK.md
└── goals/
    └── 001-builds-clean/GOAL.md
```

```yaml
# playbook.yml
name: default
description: Build a Todo app from scratch

run:
  mode: autonomous
  maxIterations: 50
  maxTaskAttempts: 3
  resume: true

checks:
  - id: builds-clean
    cmd: npm run build
  - id: tests-pass
    cmd: npm test
```

Tasks depend on each other implicitly by directory ordering, or explicitly via `dependencies` in frontmatter.

### Keyed/parameterized

Each run creates a unique epic based on an input value. Good for repetitive workflows with varying inputs (e.g., fixing different issues).

```
.converge/playbooks/fix-issue/
├── playbook.yml
└── tasks/
    ├── TASK.md         # Root WBS parent
    └── wbs.js          # Generates pipeline per issue
```

```yaml
# playbook.yml
name: fix-issue
description: Fix a GitHub issue end-to-end

inputs:
  issue:
    required: true
    description: Issue number

key: issue              # Creates epic: fix-issue-42

run:
  mode: autonomous
  maxTaskAttempts: 3
  maxDuration: 30m
  resume: true
```

```javascript
// wbs.js
export async function run(ctx) {
  const issue = ctx.vars?.issue;

  await ctx.spawn({
    id: '001-investigate',
    title: `Investigate issue #${issue}`,
    body: `Reproduce and analyze issue #${issue}...`,
  });

  await ctx.spawn({
    id: '002-implement',
    title: `Implement fix for #${issue}`,
    dependencies: ['001-investigate'],
    body: `Implement the fix...`,
  });

  await ctx.spawn({
    id: '003-verify',
    title: `Verify fix for #${issue}`,
    dependencies: ['002-implement'],
    checks: [{ id: 'tests-pass', cmd: 'npm test' }],
    body: `Run tests and verify the fix...`,
  });
}
```

Run: `converge run --playbook=fix-issue --issue=42`

### WBS-driven

A parent task uses a WBS script to dynamically spawn subtasks. The WBS can read project state and generate tasks accordingly. See the `continuous-app` example where a build phase spawns per-component tasks.

### Planning pipeline

A meta-playbook that generates other playbooks. Uses AI-driven WBS (`ctx.ai.ask()`) to analyze a prompt and decompose it into an executable plan.

```yaml
# playbook.yml
name: plan
description: Generate a playbook from a prompt

inputs:
  prompt:
    required: true
    description: What the user wants to build
  name:
    required: false
    description: Name for the generated playbook

key: name
```

Run: `converge plan "Build a REST API with auth"`

This is equivalent to `converge run --playbook=plan --prompt="Build a REST API with auth"`.

## Customization

### Adding checks

Checks can be defined at the playbook level (in `playbook.yml`) or at the task level (in TASK.md frontmatter):

```yaml
checks:
  - id: my-check
    cmd: test -f expected-output.txt
    description: Expected output exists
```

Each check has an `id`, a shell `cmd` that must exit 0, and an optional `description`.

### Adding goals

Create a `goals/<goal-id>/GOAL.md` file with a YAML frontmatter `id` and `weight`, plus a Markdown description of the goal.

### Loading skills

Skills are reusable prompt templates. Install and reference them:

```bash
converge skills install --skill=converge-planning --target=.converge/skills
```

Then in TASK.md:
```yaml
---
skills: [converge-planning]
---
```

### Input variables

Define inputs in `playbook.yml` and reference them in TASK.md with `${variable}` syntax or in wbs.js via `ctx.vars`:

```yaml
# playbook.yml
inputs:
  name:
    required: true
    description: Project name
```

```javascript
// wbs.js
const name = ctx.vars?.name;
```

## Validation

Verify a playbook is well-formed before running:

```bash
# List available playbooks and their structure
converge playbook list
converge playbook info my-playbook

# Dry-run validation
converge verify

# Run with step mode for manual verification
converge run --playbook=my-playbook --mode=step
```

The `playbook info` command shows inputs, task DAG, run configuration, and checks — useful for verifying structure before execution.
