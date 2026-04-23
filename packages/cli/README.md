# @converge/cli

**CLI for Converge** — A gap-driven framework for building deterministic, reproducible AI workflows.

This is the standalone CLI package. For the core library, see [@converge/core](../core).

---

## Installation

```bash
npm install -g @converge/cli
```

---

## Usage

```bash
# Initialize project
converge init

# Run workflows
converge run

# Show status
converge status

# Get help
converge --help
```

---

## Commands

### Workflow Execution

```bash
converge run [filter]              # Run autonomous agent loop
converge run --step                # Run one task then stop
converge run --dry                 # Dry run (plan only)
converge run --force               # Force re-run completed tasks
converge run --max-iterations 50   # Limit iterations
```

### Project Management

```bash
converge init                      # Initialize new project
converge status [filter]           # Show project status
converge verify                    # Verify project structure
converge plan "prompt"             # Generate playbook from prompt
```

### Inspection & Debugging

```bash
converge inspect [--task taskId]   # Inspect execution sessions
converge show journal              # Show execution history
converge show gantt                # Show Gantt chart
converge show graph                # Show dependency graph
converge metrics                   # Show cost and token metrics
```

### Task Management

```bash
converge reset <taskId...>         # Reset task(s) for re-execution
converge reset --all               # Reset entire project
converge goals                     # Evaluate project goals
```

---

## Path-Based Execution

Run commands directly on specific files:

```bash
converge path/to/project.yml run
converge path/to/playbook.yml status
converge path/to/TASK.md inspect
```

---

## Configuration

Create `.converge/project.yml`:

```yaml
version: 2
name: my-app
description: My autonomous AI project

runtime:
  maxIterations: 100
  
ai:
  provider: anthropic
  model: claude-3-5-sonnet-20241022
```

---

## Documentation

- [Getting Started](../../docs/getting-started.md)
- [CLI Reference](../core/CLI.md)
- [Core Library](../core/README.md)

---

## Architecture

This package is a standalone CLI that depends on `@converge/core` for all functionality. The core library can be used independently for programmatic access.

```
@converge/cli (CLI)
    ↓
@converge/core (Library)
    ↓
Your Application
```

---

## License

MIT
