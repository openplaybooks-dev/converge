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

## Experiment result — `run-2026-05-17T18-22` (misinfo, 10 personas × 3 ticks)

A real end-to-end run is committed under `vault/runs/run-2026-05-17T18-22/`. Framework stats: **47 tasks total** (1 bootstrap + 3 epoch + 9 phase + 30 persona-tick + 4 framework root tasks), `Done: 47 ok, 0 failed (42 min)`, ~30 LLM calls via `MiniMax-M2.7`.

The cohort has 10 personas spanning the skepticism spectrum — `@fact_check_dave` (0.85) and `@skeptic_mike` (0.9) at one end, `@truthseeker_88` (0.1) and `@naturallife_sarah` (0.2) at the other. The seed (tick 0) is a high-follower post by `@randomuser_bob`: *"BREAKING: Internal documents reveal major corporations have been secretly funding influential scientists to suppress research…"*

| Tick | Histogram                              | Seed reach (this / cum.) | Skeptic pushback |
|------|----------------------------------------|--------------------------|------------------|
| 1    | 6 reply · 2 repost · 2 like            | 10 / 10                  | 3                |
| 2    | 8 nothing · 1 repost · 1 like          | 2 / 10                   | 0                |
| 3    | 5 nothing · 3 post · 1 repost · 1 reply| 1 / 10                   | 0                |

**Emergent narrative** (read `vault/reports/misinfo.md` for the full per-tick analysis):

1. **Tick 1 — saturation:** 100% of personas engaged with the seed in one tick. Three high-skepticism personas (`@fact_check_dave`, `@skeptic_mike`, `@sci_writer_jen`) replied with substantive debunks; two low-skepticism partisans (`@mom_of_three_ohio`, `@truthseeker_88`) reposted without scrutiny.
2. **Tick 2 — silence wave:** 80% no-action. The initial engagement crested. One delayed amplification (`@patriot_sam_2018`) and one passive like (`@mom_of_three_ohio`). Skeptics had already spent their replies — no further pushback.
3. **Tick 3 — counter-content:** the network pivoted from reacting to *creating*. `@sci_writer_jen` posted a debunking field guide ("Want to spot health misinformation? Look for: vague 'internal documents', no peer-reviewed sources…"). `@tech_enthusiast_alex` followed with a skeptical thread. But `@truthseeker_88` pivoted to active conspiracy framing, and `@naturallife_sarah` opened a new fault line by replying to the debunker: *"Every time someone raises concerns about corporate science, someone like you shows up to call it misinformation. Who decides what counts as 'misinformation'?"*

The arc — saturation → silence → polarization — emerged from per-persona LLM decisions with **no central script**. Each persona only saw its own feed, its bio, and prior ticks' timeline. Open `vault/runs/run-2026-05-17T18-22/overview.md` in Obsidian to follow the wikilinks: each action → the post it reacted to → the actor's profile → that actor's feed snapshot for the tick.

## Process — what the run produced

Per persona × tick (30 total) the framework runs one LLM task that writes four artifacts:

1. **Feed snapshot** at `vault/runs/<runId>/feeds/<personaId>/tick-<N>.md` — the persona's view of the network at the start of the tick (posts visible to them, ranked by the chosen recommender, plus a one-line "what stands out" note).
2. **Timeline row** appended to `runs/<runId>/timeline.jsonl` — the canonical machine log, one JSON line per (persona, tick).
3. **Action vault note** at `vault/runs/<runId>/actions/t<N>-<personaId>-<action>.md` — the action text + a "Why" paragraph the LLM writes explaining the decision in terms of the persona's bio and beliefs.
4. **Post note** (if action == post) at `vault/runs/<runId>/posts/t<N>-<personaId>-post.md` — frontmatter + body + a `## Reactions` section that later persona-ticks back-link into when they repost/reply/like.

Per tick (3 total) `030-analyze` runs once after all persona-ticks complete: reads the new timeline rows, computes scenario-specific metrics (for `misinfo`: `seedReachThisTick`, `seedReachCumulative`, `skepticPushback`), appends one JSONL row to `runs/<runId>/metrics.jsonl`, writes the per-tick narrative to `vault/runs/<runId>/ticks/tick-<N>.md`, and appends to the cross-scenario running report at `vault/reports/<scenario>.md`.

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
        │   └── 000-bootstrap/TASK.md    # auto-discovered; emits N tick chain (seed:cli)
        └── templates/
            ├── epoch/TASK.md            # spawned per tick — emits 3 phase children (seed:cli)
            ├── 010-setup/TASK.md        # cohort + graph + seed posts (AI; idempotent)
            ├── 020-simulate/TASK.md     # fans out N persona-ticks (seed:cli)
            ├── 030-analyze/TASK.md      # per-tick metrics + report (AI)
            └── persona-tick/TASK.md     # one persona × one tick (AI; 1 LLM call)
```
