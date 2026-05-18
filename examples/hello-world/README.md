# Hello World

The smallest end-to-end Converge demo. Two static tasks, each creates one output file. Task 2 depends on task 1.

## What it demonstrates

- A two-task DAG with `depends_on:`
- Per-task `outputs:` and `checks:` (file existence, content, JSON shape)
- The `scripts/clean.sh` + `scripts/run.sh` convention shared across examples
- Provider routing via `.converge/project.yaml`

## Setup

The bundled `.converge/project.yaml` uses Claude Code as the provider. Pick one auth path before running:

### Option A — Claude OAuth (recommended for a first run)

```bash
claude login                 # one-time, opens a browser
unset ANTHROPIC_BASE_URL ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL
```

### Option B — Direct Anthropic API key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL
```

### Option C — Anthropic-compatible proxy (DeepSeek, MiniMax, …)

```bash
export ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
export ANTHROPIC_AUTH_TOKEN="$DEEPSEEK_API_KEY"
export ANTHROPIC_MODEL="deepseek-v4-pro[1m]"
unset ANTHROPIC_API_KEY
```

Mixing options is the most common failure: `Invalid API key · Fix external API key` (HTTP 401) on the first task. If you see that, re-run the `export` / `unset` for exactly one option above.

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
