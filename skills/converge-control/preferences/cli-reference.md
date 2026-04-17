# CLI Reference

Complete reference for all converge CLI commands and options.

---

## Commands Overview

| Command | Purpose |
|---------|---------|
| `converge run` | Execute autonomous task loop |
| `converge init` | Initialize new converge project |
| `converge status` | Show current project status |
| `converge checkpoint` | Show iteration and task state |
| `converge tree` | Visualize task dependency tree |
| `converge verify` | Verify config, structure, format, and detect issues |
| `converge reset` | Unlock task for re-run |
| `converge cleanup` | Remove orphaned journal directories |
| `converge plugins` | List loaded plugins |
| `converge gantt` | Show Gantt chart timeline |
| `converge journal` | Show execution history from logs |
| `converge inspect` | Inspect execution sessions |
| `converge skills list` | List available skills |
| `converge skills install` | Install skills to directory |

---

## converge run

Execute tasks autonomously based on detected gaps.

### Usage
```bash
converge run                                      # Autonomous loop
converge run --step                               # Execute one task
converge run --step --dry                         # Preview without executing
converge run 02-ux-design                         # Run specific epic
converge run 02-ux-design/003-generate-screens    # Run specific task
```

### Options
| Option | Description | Default |
|--------|-------------|---------|
| `--step` | Execute one task only, then exit | false |
| `--dry` | Preview execution queue without running | false |
| `--force` | Bypass blocked/completed state | false |
| `--resume` | Resume from interrupted state | false |
| `--restart` | Reset all tasks and start fresh | false |
| `--preflight` | AI strategy selection only | false |
| `--verbose` | Enable verbose logging | false |
| `--max-iterations=N` | Maximum loop iterations | 100 |
| `--max-duration=N` | Max duration in milliseconds | 3600000 |
| `--max-attempts=N` | Max retry attempts per task | 2 |
| `--auto-fix=BOOL` | Enable auto-fixing | true |

### Exit Codes
| Code | Meaning |
|------|---------|
| 0 | All tasks completed successfully |
| 1 | One or more tasks failed |
| 2 | Max iterations reached |
| 3 | Circular dependency detected |
| 4 | Invalid configuration |

---

## converge init

Initialize new converge project in current directory.

### Usage
```bash
converge init                                # Interactive prompts
converge init --name="My Project"            # With name
converge init --template=basic               # With template
```

### Options
| Option | Description | Default |
|--------|-------------|---------|
| `--name=STRING` | Project name | (prompted) |
| `--template=STRING` | Template to use | "basic" |
| `--force` | Overwrite existing files | false |

### Creates
```
.converge/
├── converge.ts              # Configuration
├── project.ts              # Project definition
├── epics/                  # Empty epics directory
└── skills/                 # Empty skills directory
```

---

## converge status

Show current execution status of all tasks.

### Usage
```bash
converge status              # All tasks
converge status --verbose    # With details
converge status --failed     # Only failed tasks
converge status --incomplete # Only incomplete tasks
```

### Output Example
```
Epic: 01-planning
  ✅ 001-create-plan (complete)
  ✅ 002-breakdown (complete)

Epic: 02-design
  🔄 001-wireframes (in progress, attempt 1)
  ⏸️  002-mockups (waiting: deps not met)

Epic: 03-implementation
  ❌ 001-setup (failed after 2 attempts)
  ⬜ 002-build (pending)
```

### Options
| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed task information |
| `--failed` | Show only failed tasks |
| `--incomplete` | Show only incomplete tasks |
| `--json` | Output as JSON |

---

## converge checkpoint

Show execution history and checkpoint state.

### Usage
```bash
converge checkpoint                  # Summary
converge checkpoint --verbose        # Detailed
converge checkpoint 001-task-name    # Specific task
```

### Output Example
```
Checkpoint: .converge/journal/.checkpoint.json
Last Updated: 2024-03-15 10:30:22

Completed Tasks:
  - 01-planning.001-create-plan
  - 01-planning.002-breakdown

Failed Tasks:
  - 03-implementation.001-setup (2 attempts)

Total Iterations: 8
```

---

## converge tree

Visualize task dependency tree.

### Usage
```bash
converge tree                # Full tree
converge tree 02-design      # Specific epic
converge tree --status       # With status indicators
```

### Output Example
```
01-planning
├── 001-create-plan ✅
└── 002-breakdown ✅
    └── depends on: 001-create-plan

02-design
├── 001-wireframes 🔄
│   └── depends on: 01-planning.002-breakdown
└── 002-mockups ⏸️
    └── depends on: 001-wireframes
```

### Options
| Option | Description |
|--------|-------------|
| `--status` | Show status indicators |
| `--verbose` | Show full task details |
| `--deps-only` | Show only dependency relationships |

---

## converge verify

Verify the entire converge project for potential issues: PROJECT.md config, TASK.md format, dependency graph, circular dependencies, missing inputs/outputs, and structural problems.

### Usage
```bash
converge verify              # Verify everything
```

---

## converge reset

Unlock task for re-execution.

### Usage
```bash
converge reset 001-task-name             # Reset task
converge reset 001-task-name --outputs   # Reset and delete outputs
converge reset 02-design                 # Reset entire epic
converge reset --failed                  # Reset all failed tasks
```

### Options
| Option | Description | Default |
|--------|-------------|---------|
| `--outputs` | Delete output files before reset | false |
| `--attempts` | Delete attempt history | false |
| `--failed` | Reset all failed tasks | false |
| `--force` | Skip confirmation prompts | false |

### What Gets Reset

**Without --outputs:**
- Task unlocked in checkpoint
- Attempt status cleared
- Ready to run again

**With --outputs:**
- All `.outputs([...])` files deleted
- Task unlocked in checkpoint
- Ready to run from scratch

**With --attempts:**
- All `attempts/` directories deleted
- Checkpoint cleared
- Complete fresh start

---

## converge cleanup

Remove orphaned journal directories that no longer have matching task definitions.

### Usage
```bash
converge cleanup                 # Remove orphaned directories
```

---

## converge plugins

List loaded plugins and their status.

### Usage
```bash
converge plugins                 # List all loaded plugins
```

---

## converge gantt

Show Gantt chart timeline of task execution.

### Usage
```bash
converge gantt                   # Show timeline
```

---

## converge journal

Show execution history from journal logs.

### Usage
```bash
converge journal                 # All epics
converge journal 02-design       # Specific epic
```

---

## converge inspect

Inspect execution sessions for debugging.

### Usage
```bash
converge inspect                         # List sessions
converge inspect --last-session          # Debug last execution
converge inspect {sessionId}             # Specific session
```

---

## converge skills

Manage skills.

### Usage
```bash
converge skills list                     # List available skills
converge skills install                  # Install skills to directory
```

---

## Global Options

Work with all commands:

| Option | Description | Default |
|--------|-------------|---------|
| `--help` | Show help message | - |
| `--version` | Show version number | - |
| `--cwd=PATH` | Set working directory | current dir |
| `--config=PATH` | Path to PROJECT.md config | .converge/PROJECT.md |

### Example
```bash
converge run --help                      # Show help
converge --version                       # Show version
converge run --cwd=/path/to/project      # Run from different directory
converge run --config=/path/to/PROJECT.md # Use custom config
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CONVERGE_LOG_LEVEL` | Log level (error/warn/info/debug) | info |
| `CONVERGE_MAX_ITERATIONS` | Default max iterations | 100 |
| `CONVERGE_MAX_ATTEMPTS` | Default max attempts | 2 |
| `CONVERGE_VERBOSE` | Enable verbose mode | false |

### Example
```bash
CONVERGE_LOG_LEVEL=debug converge run         # Debug logging
CONVERGE_MAX_ITERATIONS=500 converge run      # Increase iterations
CONVERGE_VERBOSE=true converge run            # Verbose mode
```

---

## Common Workflows

### Development
```bash
converge init --name="New App"   # Initialize
converge tree                    # Verify structure
converge verify                  # Check for issues
converge run --step              # Run step-by-step
converge status                  # Check status
converge reset 003-task          # Reset failed
converge run                     # Run to completion
```

### Debugging
```bash
converge status --failed                                     # Identify issue
converge checkpoint 003-failed-task                          # Check specific task
cat .converge/journal/epics/{epic}/tasks/{task}/attempts/wip/log.log  # View logs
converge reset 003-failed-task                               # Reset
converge run --step 003-failed-task --verbose                # Retry with verbose
```

### Production
```bash
converge run --max-iterations=1000               # Full run
converge status                                  # Check results
converge checkpoint --verbose > checkpoint.txt   # Export checkpoint
converge status --json > status.json             # Export status
```

---

## Tips

- Use `--step` during development to control execution
- Use `--dry` to preview before running
- Run `converge verify` before running to catch issues early
- Use `converge tree` to visualize dependencies
- Reset with `--outputs` when outputs are corrupted
- Use `--verbose` when debugging failures
- Set `--max-iterations` high for production
- Use environment variables for CI/CD integration
