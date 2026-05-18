# Hello World

The smallest end-to-end Converge demo. Two static tasks, each creates one output file. Task 2 depends on task 1.

## What it demonstrates

- A two-task DAG with `depends_on:`
- Per-task `outputs:` and `checks:` (file existence, content, JSON shape)
- The `scripts/clean.sh` + `scripts/run.sh` convention shared across examples
- Provider routing via `.converge/project.yaml`

## Setup

```bash
export MINIMAX_API_KEY=sk-...      # see .env.example at the repo root
```

The bundled `.converge/project.yaml` routes Claude Code through MiniMax's Anthropic-compatible endpoint (`MiniMax-M2.7`). Override with `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` to use a different provider.

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
