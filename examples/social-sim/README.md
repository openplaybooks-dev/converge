# social-sim

Persona-driven OASIS-style social simulation. Every persona's per-tick decision is a first-class converge task in the framework's task graph. Posts, feeds, and actions are real Obsidian-navigable markdown files under `vault/`.

## Quick start

```bash
cd examples/social-sim
export ANTHROPIC_API_KEY=sk-…    # MiniMax key — see .env.example at repo root

# Tiny smoke run (~9 LLM calls, ~2 min)
scripts/run.sh --population 3 --steps 2

# Default run (~33 LLM calls, ~5–10 min)
scripts/run.sh

# Different scenario
scripts/run.sh --scenario polarization
```

The shipped `vault/runs/run-…/` is a real prior run — browse it in Obsidian without executing anything.

## How it works

A bootstrap task at `tasks/000-bootstrap/TASK.md` emits a linear chain of `steps` tick tasks via `--depends-on`. Each tick task spawns its three phase children (setup → simulate → analyze), also chained. The simulate phase reads `runs/<runId>/personas.json` at runtime and fans out one persona-tick task per persona. Each persona-tick is one LLM call — read your bio, read your feed, decide one action, write the artifacts.

```
000-bootstrap (tasks/000-bootstrap/TASK.md)
  └─▶ tick-1 (templates/epoch/TASK.md)
        ├─▶ setup-tick-1     (idempotent: personas, graph, seed posts, vault scaffolding)
        ├─▶ simulate-tick-1  (fans out t1-p001 … t1-pNN)
        │     ├─▶ t1-p001    ← one LLM call: decide action, write feed/action/post MDs
        │     ├─▶ t1-p002
        │     └─▶ …
        └─▶ analyze-tick-1   (per-tick metrics, tick note, overview update)
  └─▶ tick-2 (depends-on tick-1)
        └─▶ …
  └─▶ tick-3 (depends-on tick-2)
        └─▶ …
```

## Artifacts

```
runs/<runId>/
  personas.json     # the cohort (post-setup)
  graph.json        # follow graph
  timeline.jsonl    # canonical machine log: one row per (persona, tick)
  metrics.jsonl     # one row per tick (after analyze)
vault/runs/<runId>/
  overview.md                        # run summary + wikilinks
  personas/p001.md … pNN.md          # per-persona profile (one note each)
  posts/<post-id>.md                 # per-post note (frontmatter + text + reactions)
  feeds/<persona-id>/tick-<N>.md     # per-persona per-tick feed snapshot
  actions/t<N>-<persona>-<action>.md # per-action note with the persona's "Why"
  ticks/tick-<NN>.md                 # per-tick analysis
vault/reports/<scenario>.md          # running narrative report
```

The JSONL files are the canonical machine log; the markdown files are the human-navigable view. Replies/reposts wikilink back to the original post — open `vault/` in Obsidian to navigate the run as a graph.

## Variable threading (important)

Vars do NOT auto-inherit from parent to child in converge. The bootstrap explicitly passes every var the epoch needs; the epoch explicitly passes every var the phases need; simulate explicitly passes every var the persona-tick needs. This is verbose but predictable — if a child sees `{{var}}` as a literal in its rendered TASK.md, the parent forgot to thread it.

## Scenarios

- `misinfo` — one high-follower persona seeds a misleading post on tick 0; metrics track seed reach + skeptic pushback.
- `polarization` — no seed; metrics track in-group vs cross-group engagement.
- `recommender-ab` — A/B compare two recommenders.
- `custom` or any free-text — scenario-specific notes in 030-analyze.

## Provider

`.converge/project.yml` routes `claude` through MiniMax's Anthropic-compatible endpoint (`MiniMax-M2.7`). Override `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` for any Anthropic-compatible provider. See [Switching providers](../../docs/guides/switch-providers.md).

## Layout

```
examples/social-sim/
├── README.md
├── .gitignore
├── scripts/
│   ├── run.sh           # scripts/run.sh [--scenario X] [--population N] [--steps N] [--run-id ID]
│   └── clean.sh         # scripts/clean.sh [--hard]
├── runs/                # gitignored transient state
├── vault/               # committed Obsidian deliverable
│   ├── runs/<runId>/
│   └── reports/<scenario>.md
└── .converge/
    ├── project.yml
    └── playbooks/social-sim/
        ├── playbook.yml
        ├── tasks/
        │   └── 000-bootstrap/TASK.md    # auto-discovered; emits N tick chain
        └── templates/
            ├── epoch/
            │   ├── TASK.md                                          # spawned per tick
            │   └── tasks/{010-setup,020-simulate,030-analyze}/TASK.md
            └── persona-tick/TASK.md                                 # one persona × one tick
```
