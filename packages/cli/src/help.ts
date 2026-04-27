/**
 * Per-command help text for `converge <command> --help`.
 */

const COMMAND_HELP: Record<string, string> = {
  init: `
USAGE
  converge init                       (interactive wizard — default)
  converge init --yes                 (accept all defaults, no prompts)
  converge init [name] [options]      (prefill answers)

OPTIONS
  --name=NAME               Project name (default: current directory name)
  --description=DESC        Project description
  --agents=LIST             Comma-separated providers to enable
                              Valid: claude, acp, kimi, qwen, gemini
  --default-agent=NAME      Which enabled provider is the default
  --yes, -y                 Non-interactive: accept defaults for all prompts
  --force                   Overwrite an existing .converge/ directory
  --dir=PATH                Project directory (default: cwd)

EXAMPLES
  converge init                                        # interactive wizard
  converge init --yes                                  # name=cwd, provider=claude
  converge init my-app --agents=claude,kimi --default-agent=claude
  converge init --name="Web App" --description="Full-stack app" --yes
`,

  plan: `
USAGE
  converge plan <prompt> [options]
  converge plan --prompt="Build a REST API"

OPTIONS
  --prompt=TEXT              What to build (also accepted as first positional arg)
  --name=NAME               Name for the generated playbook (default: derived from prompt)
  --update                  Update an existing playbook instead of creating new
  --dir=PATH                Project directory (default: cwd)

EXAMPLES
  converge plan "Build a React dashboard with auth"
  converge plan --prompt="REST API" --name=api-backend
  converge plan --prompt="Add dark mode" --update
`,

  run: `
USAGE
  converge run [filter] [options]

OPTIONS
  --playbook=NAME           Run a named playbook (generate epic + execute)
  --step                    Run only one iteration then exit (debug mode)
  --force                   Force-run a filtered task, bypassing blocked/completed state
  --resume                  Resume from interrupted state (recover stuck tasks)
  --restart                 Reset all tasks to pending and start fresh
  --dry, --plan             Dry run mode - planning only, no execution
  --preflight               Run AI strategy selection but stop before executing
  --unblock                 With --step, find first blocked task and run UnblockStrategy
  --wbs                     Run only WBS seeding phase
  --inc                     With --wbs, allow re-seeding already-seeded WBS parents
  --max-duration=N          Maximum duration in ms (default: 259200000 / 72h)
  --check-interval=N        Check interval in ms (default: 5000)
  --auto-fix=BOOL           Enable auto-fixing (default: true)
  --self-plan=BOOL          Enable self-planning (default: true)
  --verbose, -v             Verbose output
  --dir=PATH                Project directory (default: cwd)

MODE
  Mode is configured in playbook.yml (run.mode: oneoff | converge | loop).
  No CLI flags for mode — the playbook is the sole source of truth.

EXAMPLES
  converge run
  converge run 02-api-design
  converge run --step --dry
  converge run --playbook=my-playbook
  converge run --wbs --inc 03-build-screens
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
  journal [epicId]          Show execution history from logs
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
  --by-epic                 Break down by epic
  --by-task                 Break down by task
  --by-model                Break down by model
  --top=N                   Show top N entries
  --json                    Output as JSON
  --save                    Save metrics to file
  --dir=PATH                Project directory (default: cwd)

EXAMPLES
  converge metrics
  converge metrics --by-epic --top=5
  converge metrics --by-model --json
`,

  verify: `
USAGE
  converge verify [options]
  converge path/to/task verify [options]

PATH-BASED EXECUTION
  converge .converge/playbooks/default/tasks/01-setup verify
  converge .converge/playbooks/default/tasks/01-setup/TASK.md verify

OPTIONS
  --fix                     Auto-fix checkpoint inconsistencies
  --rules                   Show validation rules
  --dir=PATH                Project directory (default: cwd)

EXAMPLES
  converge verify
  converge verify --fix
  converge .converge/playbooks/default/tasks/03-build-screens verify
`,

  migrate: `
USAGE
  converge migrate [options]

DESCRIPTION
  Detect V1 project structure and migrate to V2.

  V1 placed spawned tasks under .converge/playbooks/{pb}/tasks/{parent}/tasks/{child}/.
  V2 places them under .converge/journal/{pb}/tasks/{parent}/spawned/{child}/ and
  tracks a playbook hash for change detection.

  Dry-run by default — no files are moved unless --apply is given.

OPTIONS
  --apply                   Move files and write journal hash (default: dry-run)
  --force                   Overwrite conflicting journal destinations
  --dir=PATH                Project directory (default: cwd)
  --verbose, -v             Show each moved task

EXAMPLES
  converge migrate                          # report what would change
  converge migrate --apply                  # execute the migration
  converge migrate --apply --force          # overwrite journal conflicts
`,

  playbook: `
USAGE
  converge playbook <subcommand> [options]

SUBCOMMANDS
  list                      List available playbooks
  info <name>               Show playbook details (inputs, DAG, run config, checks)
  history <name>            Show execution history for a playbook

OPTIONS
  --dir=PATH                Project directory (default: cwd)
  --last=N                  Show last N history entries (for history subcommand)

EXAMPLES
  converge playbook list
  converge playbook info my-playbook
  converge playbook history my-playbook --last=5
`,

  skills: `
USAGE
  converge skills <subcommand> [options]

SUBCOMMANDS
  list                      List available skills
  install                   Install skills to a target directory

OPTIONS
  --target=PATH             Target directory (default: .claude/skills)
  --skill=NAME              Specific skill to install (default: install all)
  --force                   Force overwrite existing skills
  --verbose, -v             Show detailed installation info

EXAMPLES
  converge skills list
  converge skills install
  converge skills install --skill=converge-control --force
`,

  goals: `
USAGE
  converge goals [goal] [options]

OPTIONS
  --plan                    Generate remediation plan
  --dry                     Preview remediation plan without writing files
  --verbose, -v             Show detail output for failed goals
  --dir=PATH                Project directory (default: cwd)

EXAMPLES
  converge goals
  converge goals --verbose
  converge goals --plan --dry
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
