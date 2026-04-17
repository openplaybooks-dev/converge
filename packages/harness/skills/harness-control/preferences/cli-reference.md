# CLI Reference

Complete reference for all harness CLI commands and options.

---

## Commands Overview

| Command | Purpose |
|---------|---------|
| `harness run` | Execute autonomous task loop |
| `harness init` | Initialize new harness project |
| `harness status` | Show current project status |
| `harness checkpoint` | Show iteration and task state |
| `harness tree` | Visualize task dependency tree |
| `harness verify` | Verify config, structure, format, and detect issues |
| `harness reset` | Unlock task for re-run |
| `harness cleanup` | Remove orphaned journal directories |
| `harness plugins` | List loaded plugins |
| `harness gantt` | Show Gantt chart timeline |
| `harness journal` | Show execution history from logs |
| `harness inspect` | Inspect execution sessions |
| `harness skills list` | List available skills |
| `harness skills install` | Install skills to directory |

---

## harness run

Execute tasks autonomously based on detected gaps.

### Usage
```bash
harness run                                      # Autonomous loop
harness run --step                               # Execute one task
harness run --step --dry                         # Preview without executing
harness run 02-ux-design                         # Run specific epic
harness run 02-ux-design/003-generate-screens    # Run specific task
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

## harness init

Initialize new harness project in current directory.

### Usage
```bash
harness init                                # Interactive prompts
harness init --name="My Project"            # With name
harness init --template=basic               # With template
```

### Options
| Option | Description | Default |
|--------|-------------|---------|
| `--name=STRING` | Project name | (prompted) |
| `--template=STRING` | Template to use | "basic" |
| `--force` | Overwrite existing files | false |

### Creates
```
.harness/
├── harness.ts              # Configuration
├── project.ts              # Project definition
├── epics/                  # Empty epics directory
└── skills/                 # Empty skills directory
```

---

## harness status

Show current execution status of all tasks.

### Usage
```bash
harness status              # All tasks
harness status --verbose    # With details
harness status --failed     # Only failed tasks
harness status --incomplete # Only incomplete tasks
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

## harness checkpoint

Show execution history and checkpoint state.

### Usage
```bash
harness checkpoint                  # Summary
harness checkpoint --verbose        # Detailed
harness checkpoint 001-task-name    # Specific task
```

### Output Example
```
Checkpoint: .harness/journal/.checkpoint.json
Last Updated: 2024-03-15 10:30:22

Completed Tasks:
  - 01-planning.001-create-plan
  - 01-planning.002-breakdown

Failed Tasks:
  - 03-implementation.001-setup (2 attempts)

Total Iterations: 8
```

---

## harness tree

Visualize task dependency tree.

### Usage
```bash
harness tree                # Full tree
harness tree 02-design      # Specific epic
harness tree --status       # With status indicators
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

## harness verify

Verify the entire harness project for potential issues: PROJECT.md config, TASK.md format, dependency graph, circular dependencies, missing inputs/outputs, and structural problems.

### Usage
```bash
harness verify              # Verify everything
```

---

## harness reset

Unlock task for re-execution.

### Usage
```bash
harness reset 001-task-name             # Reset task
harness reset 001-task-name --outputs   # Reset and delete outputs
harness reset 02-design                 # Reset entire epic
harness reset --failed                  # Reset all failed tasks
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

## harness cleanup

Remove orphaned journal directories that no longer have matching task definitions.

### Usage
```bash
harness cleanup                 # Remove orphaned directories
```

---

## harness plugins

List loaded plugins and their status.

### Usage
```bash
harness plugins                 # List all loaded plugins
```

---

## harness gantt

Show Gantt chart timeline of task execution.

### Usage
```bash
harness gantt                   # Show timeline
```

---

## harness journal

Show execution history from journal logs.

### Usage
```bash
harness journal                 # All epics
harness journal 02-design       # Specific epic
```

---

## harness inspect

Inspect execution sessions for debugging.

### Usage
```bash
harness inspect                         # List sessions
harness inspect --last-session          # Debug last execution
harness inspect {sessionId}             # Specific session
```

---

## harness skills

Manage skills.

### Usage
```bash
harness skills list                     # List available skills
harness skills install                  # Install skills to directory
```

---

## Global Options

Work with all commands:

| Option | Description | Default |
|--------|-------------|---------|
| `--help` | Show help message | - |
| `--version` | Show version number | - |
| `--cwd=PATH` | Set working directory | current dir |
| `--config=PATH` | Path to PROJECT.md config | .harness/PROJECT.md |

### Example
```bash
harness run --help                      # Show help
harness --version                       # Show version
harness run --cwd=/path/to/project      # Run from different directory
harness run --config=/path/to/PROJECT.md # Use custom config
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HARNESS_LOG_LEVEL` | Log level (error/warn/info/debug) | info |
| `HARNESS_MAX_ITERATIONS` | Default max iterations | 100 |
| `HARNESS_MAX_ATTEMPTS` | Default max attempts | 2 |
| `HARNESS_VERBOSE` | Enable verbose mode | false |

### Example
```bash
HARNESS_LOG_LEVEL=debug harness run         # Debug logging
HARNESS_MAX_ITERATIONS=500 harness run      # Increase iterations
HARNESS_VERBOSE=true harness run            # Verbose mode
```

---

## Common Workflows

### Development
```bash
harness init --name="New App"   # Initialize
harness tree                    # Verify structure
harness verify                  # Check for issues
harness run --step              # Run step-by-step
harness status                  # Check status
harness reset 003-task          # Reset failed
harness run                     # Run to completion
```

### Debugging
```bash
harness status --failed                                     # Identify issue
harness checkpoint 003-failed-task                          # Check specific task
cat .harness/journal/epics/{epic}/tasks/{task}/attempts/wip/log.log  # View logs
harness reset 003-failed-task                               # Reset
harness run --step 003-failed-task --verbose                # Retry with verbose
```

### Production
```bash
harness run --max-iterations=1000               # Full run
harness status                                  # Check results
harness checkpoint --verbose > checkpoint.txt   # Export checkpoint
harness status --json > status.json             # Export status
```

---

## Tips

- Use `--step` during development to control execution
- Use `--dry` to preview before running
- Run `harness verify` before running to catch issues early
- Use `harness tree` to visualize dependencies
- Reset with `--outputs` when outputs are corrupted
- Use `--verbose` when debugging failures
- Set `--max-iterations` high for production
- Use environment variables for CI/CD integration
