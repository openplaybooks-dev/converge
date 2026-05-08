/**
 * Per-command help text for `converge <command> --help`.
 */

const COMMAND_HELP: Record<string, string> = {
  seed: `
USAGE
  converge seed [options]

DESCRIPTION
  Discover and run .seed.md files from seeds/ directories. Seeds are
  reusable task-spawning scripts — nodejs seeds use the SeedContext API,
  shell seeds execute inline shell scripts. Spawned children are written
  to the journal and picked up by the next run iteration.

OPTIONS
  --select=NAME              Run only the named seed
  --dry                      Print what would run without executing
  --dir=PATH                 Project directory (default: cwd)

EXAMPLES
  converge seed
  converge seed --select=per-verb
  converge seed --dry
`,

  init: `
USAGE
  converge init                       (interactive wizard — default)
  converge init --yes                 (accept all defaults, no prompts)
  converge init [options]             (prefill answers via flags)

OPTIONS
  --name=NAME               Project name (default: current directory name)
  --description=DESC        Project description
  --agents=LIST             Comma-separated providers to enable
                              Valid: claude, acp, kimi, qwen, gemini
  --default-agent=NAME      Which enabled provider is the default
  --yes, -y                 Non-interactive: accept defaults for all prompts
  --force                   Overwrite an existing .converge/ directory
  --skills                  Install bundled skills to .claude/skills/ and .codex/skills/
  --dir=PATH                Project directory (default: cwd)

EXAMPLES
  converge init                                        # interactive wizard
  converge init --yes                                  # name=cwd, provider=claude
  converge init --name=my-app --agents=claude,kimi --default-agent=claude
  converge init --name="Web App" --description="Full-stack app" --yes
`,

  run: `
USAGE
  converge run [filter] [options]

OPTIONS
  --step                    Run only one iteration then exit (debug mode)
  --force                   Force-run a filtered task, bypassing blocked/completed state
  --resume                  Resume from interrupted state (recover stuck tasks)
  --restart                 Reset all tasks to pending and start fresh
  --dry, --plan             Dry run mode - planning only, no execution
  --max-duration=N          Maximum duration in ms (default: 259200000 / 72h)
  --check-interval=N        Check interval in ms (default: 5000)
  --verbose, -v             Verbose output
  --dir=PATH                Project directory (default: cwd)

MODE
  Mode is configured in playbook.yml (run.mode: oneoff | converge | loop).
  No CLI flags for mode — the playbook is the sole source of truth.

EXAMPLES
  converge run
  converge run 02-api-design
  converge run --step --dry
  converge run --verbose
`,

  reset: `
USAGE
  converge reset --all                       Delete entire .converge/journal/
  converge reset <playbook>                  Delete .converge/journal/<playbook>/
  converge reset <playbook> <taskPath>       Delete .converge/journal/<playbook>/tasks/<taskPath>/

DESCRIPTION
  Journal is the source of truth — reset simply removes journal state at the
  requested scope. A task-level reset also deletes any spawned descendants
  (they live inside the task subtree).

  <taskPath> is the slash-separated journal id (e.g. "parent" or
  "parent/spawn-a"), NOT the filesystem path with "tasks/" or "spawned/"
  markers — those are rejected.

OPTIONS
  --dir=PATH                Project directory (default: cwd)

EXAMPLES
  converge reset --all
  converge reset deep-research
  converge reset deep-research parent/spawn-a
`,

  status: `
USAGE
  converge status [filter] [options]

  Shows project status and task tree. Combines the former "tree" and
  "checkpoint" commands into a single view.

OPTIONS
  --checkpoint              Show checkpoint detail (iteration, timestamps, task lists)
  --filter=PATTERN          Filter tasks by name
  --detail                  Show detailed task info
  --show-paths              Show file paths
  --show-descriptions       Show task descriptions
  --only-incomplete         Show only incomplete tasks
  --max-depth=N             Maximum tree depth to display
  --show-cursor             Show cursor position
  --dir=PATH                Project directory (default: cwd)

EXAMPLES
  converge status
  converge status 02-api
  converge status --only-incomplete --max-depth=2
  converge status --checkpoint
`,

  inspect: `
USAGE
  converge inspect [options]
  converge path/to/task inspect [options]

PATH-BASED EXECUTION
  converge .converge/playbooks/default/tasks/01-setup inspect
  converge .converge/playbooks/default/tasks/01-setup/TASK.md inspect
  converge .converge/journal/default/sessions/2026-04-22T05-14-49-d5vnv4 inspect

OPTIONS
  --converge                Show convergence graph for a task (path-based only)
  --depth=N                 Tree depth (default: 2, use 0 for full expansion)
  --sessions                Show only sessions summary
  --json                    Export to JSON format
  --verbose, -v             Verbose output
  --dir=PATH                Project directory (default: cwd)

EXAMPLES
  converge inspect
  converge .converge/playbooks/default/tasks/03-build-screens/001-home inspect
  converge .converge/playbooks/default/tasks/03-build-screens/001-home inspect --converge
  converge inspect --sessions --json
`,

  show: `
USAGE
  converge show <view> [options]

VIEWS
  gantt                     Show Gantt chart timeline of execution order
  graph [filter]            Show task dependency graph (add --detail for data flow)
  journal [groupId]          Show execution history from logs
  backlog                   Show accumulated backlog items (tech debt, TODOs)
  trend                     Show weighted gap convergence trend across runs

VIEW OPTIONS
  gantt:
    --only-blocked          Show only blocked tasks
    --only-ready            Show only ready (runnable) tasks

  graph:
    --detail                Show data flow detail

  journal:
    --only-retries          Show only tasks with multiple attempts

  backlog:
    --severity=LEVEL        Filter by severity
    --json                  Output as JSON

EXAMPLES
  converge show gantt
  converge show graph --detail
  converge show journal 03-implement
  converge show backlog --severity=high
  converge show trend
`,

  metrics: `
USAGE
  converge metrics [options]

OPTIONS
  --playbook=NAME           Filter to a specific playbook (default: all playbooks)
  --by-epic                 Break down by group
  --by-task                 Break down by task
  --by-model                Break down by model
  --top=N                   Show top N entries
  --json                    Output as JSON
  --save                    Save metrics to file
  --dir=PATH                Project directory (default: cwd)

EXAMPLES
  converge metrics
  converge metrics --playbook=default
  converge metrics --by-epic --top=5
  converge metrics --by-model --json
  converge metrics --by-epic --top=5
  converge metrics --by-model --json
`,

};

/**
 * Print per-command help. Returns true if help was found and printed.
 */
export function showCommandHelp(command: string): boolean {
  const text = COMMAND_HELP[command];
  if (!text) {
    console.error(`No help available for "${command}".`);
    console.error('Run "converge help" to see all commands.');
    return false;
  }
  console.log(text);
  return true;
}
