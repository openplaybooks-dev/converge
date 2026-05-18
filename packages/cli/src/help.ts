/**
 * Per-command help text for `converge <command> --help`.
 */

const COMMAND_HELP: Record<string, string> = {
  init: `
USAGE
  converge init                       (interactive wizard — default)
  converge init --yes                 (accept all defaults, no prompts)
  converge init [options]             (prefill answers via flags)

DESCRIPTION
  Scaffolds .converge/project.yaml and .converge/.gitignore.
  Interactive init can pick a provider template, enabled agents, and default agent.

OPTIONS
  --name=NAME               Project display name written to project.yaml
                              (default: current directory name; rarely needed)
  --description=DESC        Project description
  --provider-template=NAME  Provider preset to seed .converge/project.yaml
                              Valid: claude, codex, acp, kimi, qwen, gemini, deepcode, custom
  --agents=LIST             Comma-separated providers to enable
                              Valid: claude, acp, kimi, qwen, gemini, codex, deepcode
  --default-agent=NAME      Which enabled provider is the default
  --yes, -y                 Non-interactive: accept defaults for all prompts
  --force                   Overwrite an existing .converge/ directory
  --skills                  Install bundled skills to .claude/skills/ and .codex/skills/
EXAMPLES
  converge init                                            # interactive wizard
  converge init --yes                                      # name=cwd, provider=claude
  converge init --provider-template=codex                  # use the Codex preset
  converge init --agents=claude,kimi --default-agent=claude  # multi-agent mix
  converge init --description="Full-stack app" --yes       # cwd-named, with description
  converge init --skills                                   # with bundled skills
`,

  add: `
USAGE
  converge add [options]

DESCRIPTION
  Create a new playbook in the current project. Three sources:

  --from-prompt     Generate a playbook from a natural-language description.
                    The AI decomposes the goal into tasks, writes TASK.md files,
                    declares dependencies, and adds shell-level checks.
  --from-example    Copy a built-in example playbook.
  --from-github     Clone a playbook from a GitHub repository.

  Requires .converge/project.yaml (run "converge init" first).

OPTIONS
  --from-prompt="..."       Generate a playbook from a natural-language description
  --from-example=NAME       Copy a built-in example playbook
  --from-github=USER/REPO   Clone a playbook from a GitHub repository
                              Supports: user/repo, user/repo/subdir, or full URL
  --name=NAME               Playbook name (default: inferred from source)
  --force                   Overwrite existing playbook directory
EXAMPLES
  converge add                                                       # interactive mode
  converge add --from-prompt "Build a blog with Next.js"
  converge add --from-prompt "Literature review on in-context learning"
  converge add --from-example hello-world
  converge add --from-example deep-research --name=my-research
  converge add --from-github user/my-playbook
`,

  run: `
USAGE
  converge run [filter] [options]

DESCRIPTION
  Execute tasks via the convergence loop: dispatch AI agents, run checks,
  retry on failure, converge results. The primary execution verb.

  Execution has one scheduler. Tasks and seeds decide when to continue:
  checks gate task completion, and incremental seeds can call ctx.loop.continue()
  until they choose ctx.loop.stop() or maxIterations/maxDuration is reached.

  RELATED COMMANDS (still work, just hidden from top-level help):
    build   → run --fail-fast
    test    → run --checks-only
    retry   → run --resume
    compile → run --dry
OPTIONS
  --select, -s <expr>         Select tasks by ID, tag, status, or graph operator
  --exclude, -e <expr>        Subtract from the selection
  --selector <name>           Shortcut for --select selector:NAME
  --state=PATH                Path to a prior target/ for state: comparisons
  --defer                     Use prior outputs instead of re-running upstream
  --fail-fast                 Stop on first uncorrectable failure
  --resume                    Resume from the last failure point
  --dry                       Print the would-run preview, no execution
  --step                      Run one iteration, then stop
  --full-refresh              Force non-incremental execution
  --max-duration=N            Maximum duration in ms (default: 259200000 / 72h)
  --verbose, -v               Verbose output

EXAMPLES
  converge run
  converge run --fail-fast                           # build mode
  converge run --resume                              # retry mode
  converge run --dry                                 # compile/preview
  converge run --select=03-implement
  converge run --fail-fast --select=03-implement
`,

  list: `
USAGE
  converge list [options]
  converge ls [options]

DESCRIPTION
  Print tasks matching a selection. The "what would run" preview —
  use before "run" to confirm the resolved task set. Mirror of dbt ls.

  Also lists playbooks with --playbooks.

OPTIONS
  --select, -s <expr>         Select tasks by ID, tag, status, or graph operator
  --exclude, -e <expr>        Subtract from the selection
  --selector <name>           Shortcut for --select selector:NAME
  --state=PATH                Path to a prior target/ for state: comparisons
  --max-depth=N               Limit traversal to N levels
  --output=FORMAT             Output format: table, json, name, path, selector
  --playbooks                 List playbooks instead of tasks
  --verbose, -v               Verbose output

EXAMPLES
  converge list
  converge list --select 'state:modified+' --state /tmp/last-good
  converge list --exclude 'status:complete'
  converge list --output=json
  converge list --playbooks
`,

  show: `
USAGE
  converge show <view> [options]

VIEWS
  gantt                     Show Gantt chart timeline of execution order
  graph [filter]            Show task dependency graph (add --detail for data flow)
  journal [groupId]          Show execution history from logs
  metrics                   Show cost, token, and model metrics
  trend                     Show weighted gap convergence trend across runs

VIEW OPTIONS
  gantt:
    --only-blocked          Show only blocked tasks
    --only-ready            Show only ready (runnable) tasks

  graph:
    --detail                Show data flow detail

  journal:
    --only-retries          Show only tasks with multiple attempts

  metrics:
             Filter to a specific playbook
    --by-epic               Break down by group
    --by-task               Break down by task
    --by-model              Break down by model
    --top=N                 Show top N entries
    --json                  Output as JSON
    --save                  Save metrics to file

EXAMPLES
  converge show gantt
  converge show gantt --only-blocked
  converge show graph
  converge show graph --detail
  converge show journal 03-implement
  converge show journal --only-retries
  converge show metrics
  converge show metrics --by-model --top=5
  converge show trend
`,

  inspect: `
USAGE
  converge inspect [options]

DESCRIPTION
  Inspect execution sessions and tasks. Shows checkpoint detail,
  convergence graphs, session history, and structured output.

OPTIONS
  --converge                Show convergence graph for a task
  --depth=N                 Tree depth (default: 2, use 0 for full expansion)
  --sessions                Show only sessions summary
  --json                    Export to JSON format
  --verbose, -v             Verbose output
  --task=NAME               Target a specific task

EXAMPLES
  converge inspect
  converge inspect --task=01-setup
  converge inspect --task=01-setup --converge
  converge inspect --sessions --json
`,

  stop: `
USAGE
  converge stop  [options]

DESCRIPTION
  Stop an active run for a playbook and remove its run lock.

OPTIONS

EXAMPLES
  converge stop --playbook=name-exploration
`,

  clean: `
USAGE
  converge clean [options]

DESCRIPTION
  Delete artifacts under target/ and journal subtrees. A surgical
  alternative to --full-refresh: clean specific tasks instead of
  rebuilding everything.

  Also resets task state when targeting specific tasks (formerly "reset").

OPTIONS
  --select, -s <expr>         Select tasks to clean
  --exclude, -e <expr>        Subtract from the selection
  --yes, -y                   Skip confirmation prompt
  --all                       Clean all targets (full reset)
  --verbose, -v               Verbose output

EXAMPLES
  converge clean --select=failed-task-id
  converge clean --all --yes
  converge clean
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
