---
id: setup-tick-{{tickNum}}
title: "Tick {{tick}} — setup"
description: >-
  Ensure persona cohort, follow graph, and seed posts exist. Tick 1
  generates them; later ticks verify and exit.
depends_on:
  - "tick-{{tickNum}}"
vars:
  tickNum: "{{tickNum}}"
  tick: "{{tick}}"
  runId: "{{runId}}"
  scenario: "{{scenario}}"
  populationSize: "{{populationSize}}"
  steps: "{{steps}}"
  recommender: "{{recommender}}"
  seedPosts: "{{seedPosts}}"
  rngSeed: "{{rngSeed}}"
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
    cmd: >-
      python3 -c "import json,sys;
      d=json.load(open('runs/{{runId}}/personas.json'));
      sys.exit(0 if isinstance(d,list) and len(d)=={{populationSize}} else 1)"
    description: "Persona count matches populationSize"
  - id: graph-present
    cmd: "test -f runs/{{runId}}/graph.json"
    description: "Follow graph exists"
  - id: timeline-file-exists
    cmd: "touch runs/{{runId}}/timeline.jsonl && test -f runs/{{runId}}/timeline.jsonl"
    description: "timeline.jsonl exists (touched if missing)"
  - id: vault-overview
    cmd: "test -f vault/runs/{{runId}}/overview.md"
    description: "Obsidian vault overview note exists"
  - id: vault-persona-notes
    cmd: >-
      test "$(ls vault/runs/{{runId}}/personas/*.md 2>/dev/null | wc -l | tr -d ' ')"
      = "{{populationSize}}"
    description: "One persona vault note per persona"
  - id: seed-post-notes
    cmd: >-
      test "$(ls vault/runs/{{runId}}/posts/t0-seed-*.md 2>/dev/null | wc -l | tr -d ' ')"
      -ge "{{seedPosts}}"
    description: "Seed post vault notes exist (≥ seedPosts)"
---

# Tick {{tick}} — Setup

**Tick:** {{tick}} ({{tickNum}}) · **Run:** `{{runId}}` · **Scenario:** `{{scenario}}` · **Population:** {{populationSize}} · **Seed:** `{{rngSeed}}`

## What this task does

Ensure the simulation's shared state files exist. **Tick 1 generates them. Later ticks only verify.**

If `runs/{{runId}}/personas.json` already exists, confirm the checks pass and exit — do NOT regenerate, overwrite, or append.

## On tick 1 (when files are absent)

### 1. `runs/{{runId}}/personas.json`

JSON array of exactly **{{populationSize}}** persona objects:

```json
{
  "id": "p001",
  "handle": "@truthseeker_88",
  "bio": "One sentence describing this persona's worldview.",
  "beliefs": { "openness": 0.7, "skepticism": 0.4, "partisanship": -0.2 },
  "interests": ["climate", "tech", "local-politics"]
}
```

- Ids: `p001` … `p{{populationSize}}` (zero-padded to 3).
- Diversity matters. For `misinfo`: include believers, skeptics, and on-the-fence personas.
- Use seed `{{rngSeed}}` for any randomness (deterministic reruns).

### 2. `runs/{{runId}}/graph.json`

```json
{ "follows": { "p001": ["p003", "p007"], "p002": ["p001"], ... } }
```

Scale-free degree distribution (Barabási–Albert-style, m=2). Slight homophily by beliefs.

### 3. `runs/{{runId}}/timeline.jsonl`

For each seed post (count = `{{seedPosts}}`), append one JSON line:

```json
{"id": "t0-seed-001", "tick": 0, "personaId": "<highest-out-degree>", "action": "post", "text": "<seed claim>", "seed": true, "ts": "<iso8601>"}
```

For `misinfo`: seeder = persona with the most followers; text is the seed claim. For other scenarios, set seedPosts=0 or use a neutral kick-off post.

### 4. Persona vault notes — one per persona

`vault/runs/{{runId}}/personas/<id>.md`:

```markdown
---
tags: [persona, run/{{runId}}, persona/<id>]
persona_id: <id>
handle: "<handle>"
beliefs: { openness: 0.7, skepticism: 0.4, partisanship: -0.2 }
interests: [climate, tech, local-politics]
follows: [p003, p007]
---

# <handle>

> <bio>

## Beliefs
- Openness: 0.7
- Skepticism: 0.4
- Partisanship: -0.2

## Follows
- [[p003]]
- [[p007]]

## Posts
_(populated by simulate tasks)_

## Reactions to me
_(populated by simulate tasks)_
```

### 5. Seed post vault notes — one per seed post

`vault/runs/{{runId}}/posts/t0-seed-<NNN>.md`:

```markdown
---
tags: [post, run/{{runId}}, tick/0, persona/<personaId>, action/post, seed]
post_id: t0-seed-<NNN>
tick: 0
author: <personaId>
seed: true
ts: <iso8601>
---

# Seed post — [[../personas/<personaId>|<personaId>]]

> <text of the seed claim>

This is the seed post that kicks off the {{scenario}} scenario.

## Reactions
_(populated by persona-tick tasks as they repost / reply / like)_

## See Also
- Author: [[../personas/<personaId>]]
- [[../overview|Run overview]]
- [[../ticks/tick-01|Tick 1]] _(first reactions appear here)_
```

### 6. Overview note `vault/runs/{{runId}}/overview.md`

```markdown
---
tags: [run, run/{{runId}}, scenario/{{scenario}}]
run_id: {{runId}}
scenario: {{scenario}}
population_size: {{populationSize}}
steps: {{steps}}
recommender: {{recommender}}
seed: {{rngSeed}}
---

# Run `{{runId}}` — {{scenario}}

Population **{{populationSize}}** · Steps **{{steps}}** · Recommender `{{recommender}}` · Seed `{{rngSeed}}`

## Personas
- [[personas/p001]] — @<handle> — <one-line bio>
- …one bullet per persona…

## Ticks
- [[ticks/tick-01]] _(pending)_
- [[ticks/tick-02]] _(pending)_
- …

## Seed posts
- [[posts/t0-seed-001]] — <truncated text> _(by [[personas/<personaId>]])_

## See Also
- [[../../reports/{{scenario}}|Scenario report]]
```

The "pending" markers are placeholders — the analyze task in each tick rewrites this overview with real tick summaries.

## On tick > 1

Confirm the checks pass and exit. Do NOT regenerate or overwrite anything.

## Tools

Full Read/Write/Bash. Python (`python3`) is fine for JSON/graph work. Do NOT invoke `pnpm sim` or any other non-existent tooling — the playbook IS the simulator.
