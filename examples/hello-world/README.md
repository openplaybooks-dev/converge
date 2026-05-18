# Hello World

The smallest end-to-end Converge demo. Two static tasks, each creates one output file. Task 2 depends on task 1.

## What it demonstrates

- A two-task DAG with `depends_on:`
- Per-task `outputs:` and `checks:` (file existence, content, JSON shape)
- The `scripts/clean.sh` + `scripts/run.sh` convention shared across examples
- Provider routing via `.converge/project.yaml`

## Setup

The bundled `.converge/project.yaml` uses the default Claude Code provider. Make sure you're signed in to Claude Code (or have `ANTHROPIC_API_KEY` set in your environment) before running.

## Run

```bash
cd examples/hello-world
scripts/run.sh           # wipe journal + artifacts, then run
scripts/run.sh --hard    # also wipe output/ (full fresh run)
```

Both tasks should converge in <30s on a typical run.

## Outputs

- `output/greeting.json` — `{ name, language, timestamp }` (created by `01-create-greeting`)
- `output/hello.txt` — plain-text greeting line rendered from the JSON (created by `02-render-hello`)

## Structure

```
.
├── scripts/
│   ├── clean.sh
│   └── run.sh
└── .converge/
    ├── project.yaml
    └── playbooks/default/
        ├── playbook.yml
        └── tasks/
            ├── 01-create-greeting/TASK.md
            └── 02-render-hello/TASK.md
```
