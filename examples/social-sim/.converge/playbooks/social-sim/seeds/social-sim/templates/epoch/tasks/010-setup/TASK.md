---
id: "{{taskId}}"
title: "Tick {{tick}} — setup"
description: >
  Ensure persona cohort, follow graph, and seed posts exist. Idempotent: only
  generates on tick 1; later ticks just verify the files are present.
{{setupDependsBlock}}
inputs: []
outputs:
  - "runs/{{runId}}/personas.json"
  - "runs/{{runId}}/graph.json"
  - "runs/{{runId}}/timeline.jsonl"
  - "vault/runs/{{runId}}/overview.md"
  - "vault/runs/{{runId}}/personas/p001.md"
checks:
  - id: personas-present
    cmd: "test -f runs/{{runId}}/personas.json"
    description: "Persona cohort exists"
  - id: personas-count
    cmd: >
      python3 -c "import json,sys;
      d=json.load(open('runs/{{runId}}/personas.json'));
      sys.exit(0 if isinstance(d,list) and len(d)=={{populationSize}} else 1)"
    description: "Persona count matches populationSize"
  - id: graph-present
    cmd: "test -f runs/{{runId}}/graph.json"
    description: "Follow graph exists"
  - id: graph-valid
    cmd: >
      python3 -c "import json,sys;
      d=json.load(open('runs/{{runId}}/graph.json'));
      sys.exit(0 if 'follows' in d and isinstance(d['follows'],dict) else 1)"
    description: "graph.json has a `follows` map"
  - id: timeline-file-exists
    cmd: "touch runs/{{runId}}/timeline.jsonl && test -f runs/{{runId}}/timeline.jsonl"
    description: "timeline.jsonl exists (touched if missing)"
  - id: vault-overview
    cmd: "test -f vault/runs/{{runId}}/overview.md"
    description: "Obsidian vault overview note exists"
  - id: vault-persona-notes
    cmd: >
      test "$(ls vault/runs/{{runId}}/personas/*.md 2>/dev/null | wc -l | tr -d ' ')"
      = "{{populationSize}}"
    description: "One persona vault note per persona"
---

# Tick {{tick}} — Setup

**Tick:** {{tick}} ({{tickNum}}) · **Run:** `{{runId}}` · **Scenario:**
`{{scenario}}` · **Population:** {{populationSize}} · **Seed:** `{{seed}}`

## What this task does

Ensure the simulation's shared state files exist under `runs/{{runId}}/`.
**Tick 1 generates them. Later ticks just verify.**

If `runs/{{runId}}/personas.json` already exists, do **NOTHING** except
confirm the checks pass. Do not regenerate, do not overwrite, do not append.

## What to produce on tick 1 (when files are absent)

### 1. `runs/{{runId}}/personas.json`

A JSON array of exactly **{{populationSize}}** persona objects. Each entry:

```json
{
  "id": "p001",
  "handle": "@truthseeker_88",
  "bio": "One short sentence describing this persona's worldview, profession, demographic.",
  "beliefs": {
    "openness": 0.7,
    "skepticism": 0.4,
    "partisanship": -0.2
  },
  "interests": ["climate", "tech", "local-politics"]
}
```

- Persona ids: `p001`, `p002`, … `p{{populationSize}}` (zero-padded to 3).
- Diversity matters: spread beliefs across the spectrum so the scenario has
  signal. For `misinfo`: include believers, skeptics, and on-the-fence.
- Use seed `{{seed}}` for any random choices so reruns are deterministic.

### 2. `runs/{{runId}}/graph.json`

```json
{
  "follows": {
    "p001": ["p003", "p007"],
    "p002": ["p001"],
    ...
  }
}
```

A Barabási–Albert-style follow graph: scale-free degree distribution. With
`populationSize={{populationSize}}` and `m=2` (each new node adds 2 edges),
this is small but realistic. Personas with similar `beliefs` should cluster
slightly (homophily).

### 3. `runs/{{runId}}/timeline.jsonl`

Empty file (just `touch` it). Personas append to this in `020-simulate`.

### 4. Obsidian-vault notes (the human-readable view of state)

Mirror the run state into `vault/runs/{{runId}}/`. The vault is what a
human opens in Obsidian to navigate the simulation. Every note must:

- Have YAML frontmatter (tags, structured fields).
- Use `[[wikilinks]]` for any cross-references (persona-to-persona,
  persona-to-action, tick-to-persona).
- Be plain Markdown otherwise — no JSON in the body.

#### `vault/runs/{{runId}}/overview.md`

```markdown
---
tags: [run, run/{{runId}}, scenario/{{scenario}}]
run_id: {{runId}}
scenario: {{scenario}}
population_size: {{populationSize}}
steps: {{steps}}
recommender: {{recommender}}
seed: {{seed}}
---

# Run `{{runId}}` — {{scenario}}

Population size: **{{populationSize}}** · Steps: **{{steps}}** ·
Recommender: `{{recommender}}` · Seed: `{{seed}}`

## Personas
- [[p001]] — @<handle> — <one-line bio>
- [[p002]] — @<handle> — <one-line bio>
- ...one bullet per persona...

## Ticks
- [[tick-01]] _(pending)_
- [[tick-02]] _(pending)_
- [[tick-03]] _(pending)_

## See Also
- [[../../reports/{{scenario}}|Scenario report]]
```

(The "pending" markers are placeholders — the analyze task in each tick
will rewrite this overview with the actual tick links.)

#### `vault/runs/{{runId}}/personas/<id>.md` — one note per persona

```markdown
---
tags: [persona, run/{{runId}}, persona/<id>]
persona_id: <id>
handle: "<handle>"
beliefs:
  openness: 0.7
  skepticism: 0.4
  partisanship: -0.2
interests: [climate, tech, local-politics]
follows: [p003, p007]
---

# @<handle>

> <bio paragraph from personas.json>

## Beliefs
- **Openness:** 0.7
- **Skepticism:** 0.4
- **Partisanship:** -0.2

## Follows
- [[p003]]
- [[p007]]

## Followers
_(populated by analyze tasks as personas follow each other during the run)_

## Actions
_(populated by simulate tasks — one bullet per action this persona takes)_
```

Use the actual fields from the persona's entry in `personas.json`. The
`Followers` block lists, by reading `graph.json`, all personas whose
`follows` list contains this persona (that's a reverse lookup — do it
once with Python and write the resolved list into the note).

For the seed persona on tick 1 (the `misinfo` seeder), also link the
seed action: `## Actions\n- [[t0-<id>-post]] — Tick 0 (seed)`.

### Idempotence note

If `vault/runs/{{runId}}/overview.md` already exists, do not regenerate
the persona notes or overview — the run is being resumed. Just confirm
the checks pass.

### Vault root README (only on first run)

If `vault/README.md` does not exist, create it as the vault entry point:

```markdown
---
tags: [vault, social-sim]
---

# Social Simulation Vault

Open this folder in Obsidian to navigate runs.

## Runs
- [[runs/{{runId}}/overview|{{runId}}]] — {{scenario}}, {{populationSize}} personas, {{steps}} ticks

## Reports
- [[reports/{{scenario}}|{{scenario}}]]

## Tags
Tap a tag in the sidebar to filter:
- `#run` — every run overview
- `#tick` — every per-tick analysis
- `#persona` — every persona profile
- `#action` — every individual action (post/repost/reply/like/follow)
- `#scenario/<id>` — pick a scenario
- `#belief/skeptic`, `#belief/believer`, etc. — filter by stance
```

If it does exist (resumed run), append a new bullet under `## Runs`
linking this run, only if not already present. Don't rewrite.

### 4. Scenario seed (only on tick 1, only if `{{scenario}}` warrants it)

For `misinfo`: pick the persona with the **highest** outgoing-edge count
(most followed) as the seeder. Append **{{seedPosts}}** seed post(s) to
`timeline.jsonl` with `tick: 0` (pre-simulation), labeled
`"seed": true`. Schema:

```json
{"tick": 0, "personaId": "pXXX", "action": "post", "text": "<short misleading claim>", "seed": true, "ts": "<iso8601>"}
```

Also write a vault note for each seed action at
`vault/runs/{{runId}}/actions/t0-<personaId>-post.md`:

```markdown
---
tags: [action, run/{{runId}}, tick/0, persona/<personaId>, action/post, seed]
tick: 0
persona_id: <personaId>
action: post
seed: true
ts: <iso8601>
---

# Tick 0 — [[<personaId>]] posted (seed)

> <text of the seed claim>

This is the seed post that kicks off the {{scenario}} scenario.

## See Also
- Actor: [[<personaId>]]
- [[overview|Run overview]]
- [[tick-01]] _(reactions begin here)_
```

For other scenarios (`polarization`, `recommender-ab`, `custom`): no seed
posts on tick 1; let dynamics emerge naturally.

## What to produce on tick > 1

Nothing. The files already exist. Confirm via the checks; do not modify.

## Tools

You have full Read / Write / Bash. Use Python (`python3`) for JSON or
graph generation if convenient. Do **not** invoke any `pnpm sim` commands —
this playbook does not have a simulator binary; the playbook IS the
simulator.
