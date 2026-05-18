# Hello World

The smallest end-to-end Converge demo. Two static tasks, each creates one output file. Task 2 depends on task 1.

## What it demonstrates

- A two-task DAG with `depends_on:`
- Per-task `outputs:` and `checks:` (file existence, content, JSON shape)
- The `scripts/clean.sh` + `scripts/run.sh` convention shared across examples
- Provider routing via `.converge/project.yaml`

## Setup

The bundled `.converge/project.yaml` uses Claude Code (the agent CLI) with Anthropic OAuth (the LLM endpoint). If that suits you — `claude login` once and you're done; skip to **Run**.

For a different auth path, re-scaffold the example's `project.yaml` with one of these `--backend` / `--provider` combos:

```bash
# Claude via OAuth — no env needed (this is the bundled default)
converge init --force --backend=claude --provider=anthropic-oauth

# Claude via direct Anthropic API key
converge init --force --backend=claude --provider=anthropic
export ANTHROPIC_API_KEY=sk-ant-...

# Claude routed via MiniMax (cheap, single-model)
converge init --force --backend=claude --provider=minimax
export MINIMAX_API_KEY=...

# Claude routed via DeepSeek (cheap, two-tier model)
converge init --force --backend=claude --provider=deepseek
export DEEPSEEK_API_KEY=...
```

The proxy providers (`minimax`, `deepseek`) bake the full vendor-recommended env block into `.converge/project.yaml`, so Converge launches `claude` with the right routing automatically — no per-shell `ANTHROPIC_*` exports.

If `converge run` ever returns `Invalid API key · Fix external API key` (HTTP 401), check that loose `ANTHROPIC_*` env vars in your shell aren't overriding the project.yaml — `env | grep ANTHROPIC_` and `unset` anything you didn't intend.

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
