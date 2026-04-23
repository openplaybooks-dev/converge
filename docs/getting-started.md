# Getting Started with Converge

This guide walks you through creating and running your first Converge playbook. By the end, you will have a working playbook with tasks, checks, and a convergence goal.

## Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org/)
- **npm** or **pnpm**
- Basic terminal/command-line knowledge

## Installation

Install Converge globally:

```bash
npm install -g @converge/core
```

Or install locally in your project:

```bash
npm install @converge/core
```

Verify the installation:

```bash
converge --help
```

## Your First Playbook

### Option A: AI-assisted (recommended)

```bash
converge init --name="my-project"
converge plan "create a hello world Node.js app with tests"
converge run
```

`converge init` creates the `.converge/` directory with a default playbook. `converge plan` generates tasks from your prompt. `converge run` executes them.

### Option B: Manual setup

```bash
converge init --name="my-project"
mkdir .converge/playbooks/default/tasks/01-setup
```

Create `.converge/playbooks/default/tasks/01-setup/TASK.md`:

```markdown
---
title: Project Setup
checks:
  - id: readme-exists
    cmd: test -f README.md
    description: README.md exists
  - id: has-title
    cmd: grep -q '^# ' README.md
    description: README has a title
---

Create a README.md file for this project.

1. Create README.md with a project title and description
2. Include a "## Getting Started" section
```

Run:

```bash
converge run
```

Converge will execute the task, run the checks, and self-correct if anything fails.

## Understanding the Output

When you run a playbook, Converge:

1. **Scans** — discovers all tasks in the playbook
2. **Executes** — runs the next pending task
3. **Verifies** — runs all checks defined in the task
4. **Self-corrects** — if checks fail, generates a `LEARN.md` with failure analysis and retries

Task progress is recorded in `.converge/journal/`. You can inspect the current state at any time:

```bash
converge tree       # view the task tree
converge status     # show project status
```

## Adding a Second Task

Add a second task that runs after the first. Create `.converge/playbooks/hello/tasks/02-content/TASK.md`:

```markdown
---
title: Add Content
dependencies:
  - 01-setup
checks:
  - id: content-exists
    cmd: test -f src/index.ts
    description: Main source file exists
---

Create the main source file at src/index.ts with a hello world function.
```

Tasks are ordered by their numeric prefix (`01-`, `02-`). Dependencies ensure a task only runs after its prerequisites are complete.

## Adding a Goal

Goals define the target state for your project. Converge measures the gap between reality and the goal, then generates corrective work to close it.

Create `.converge/playbooks/hello/goals/001-builds-clean/GOAL.md`:

```markdown
---
id: builds-clean
weight: 10
---

# Builds Clean

The project must build without errors.

\`\`\`bash
npm run build
\`\`\`
```

Run with goal convergence:

```bash
converge .converge/playbooks/hello/playbook.yml run --converge
```

Converge will keep looping until the goal is satisfied.

## Adding Checks

Checks are shell commands that must exit `0` for a task to pass. Define them in the TASK.md frontmatter:

```yaml
checks:
  - id: schema-valid
    cmd: "node validate-schema.js"
    description: Database schema is valid
  - id: no-lint-errors
    cmd: "npx eslint src/ --max-warnings=0"
    description: No lint errors
```

Checks are deterministic verification. If a check fails, Converge generates a `LEARN.md` analyzing the failure and retries the task with targeted corrections.

## Next Steps

- Browse the [examples](../packages/core/examples/) for full playbook implementations
- Read the [core README](../packages/core/README.md) for architecture and advanced features
- Learn about [WBS (dynamic task spawning)](../packages/core/README.md) for tasks that generate subtasks at runtime
