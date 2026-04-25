---
id: 030-analyze
title: Tick 3 — analyze
description: "Compute per-tick metrics from the rows added this tick, append to metrics.jsonl, update vault/reports/misinfo.md.\n"
dependencies:
  - 020-simulate
inputs:
  - runs/run-2026-04-25T01-45/personas.json
  - runs/run-2026-04-25T01-45/timeline.jsonl
outputs:
  - runs/run-2026-04-25T01-45/metrics.jsonl
  - vault/reports/misinfo.md
  - vault/runs/run-2026-04-25T01-45/ticks/tick-3.md
  - vault/runs/run-2026-04-25T01-45/overview.md
checks:
  - id: metrics-row-appended
    description: metrics.jsonl has exactly one row with tick=3
    cmd: "python3 -c \"import json,sys; lines=[json.loads(l) for l in open('runs/run-2026-04-25T01-45/metrics.jsonl') if l.strip()]; hits=[l for l in lines if l.get('tick')==3]; sys.exit(0 if len(hits)==1 else 1)\"\n"
  - id: report-mentions-tick
    description: vault/reports/misinfo.md mentions this tick
    cmd: "grep -q 'Tick 3' vault/reports/misinfo.md"
  - id: vault-tick-note
    description: Vault tick note exists
    cmd: test -f vault/runs/run-2026-04-25T01-45/ticks/tick-3.md
  - id: vault-overview-links-tick
    description: Run overview links to this tick
    cmd: "grep -q 'tick-3' vault/runs/run-2026-04-25T01-45/overview.md"
vars:
  tick: 3
  tickNum: 3
  runId: run-2026-04-25T01-45
  scenario: misinfo
  populationSize: 10
  steps: 3
  recommender: hot-score
  seedPosts: 1
  seed: 42
  epochTemplateDir: /Users/minh/Documents/converge/examples/social-sim/.converge/playbooks/social-sim/wbs/templates/epoch
  taskId: 030-analyze
---

# Tick 3 — Analyze

Compute the metrics for this tick and update the running report.

## Step 1 — Read this tick's actions

Read `runs/run-2026-04-25T01-45/timeline.jsonl`. Filter to rows where
`tick == 3` (this tick only — earlier ticks are already
analyzed). You should see one row per persona.

## Step 2 — Compute per-tick metrics

A JSON object with these fields (use Python or jq via Bash; do not hand-count):

```json
{
  "tick": 3,
  "scenario": "misinfo",
  "totalActions": <int>,
  "actionHistogram": {"post": N, "repost": N, "reply": N, "like": N, "follow": N, "nothing": N},
  "uniqueActors": <int>,
  "newPostsThisTick": <int>,                 // count of action == "post"
  "engagementsThisTick": <int>,              // repost+reply+like
  "scenarioMetrics": { ... }                 // see below — scenario-specific
}
```

For `scenario == "misinfo"`: `scenarioMetrics` should include:
- `seedReachThisTick` — count of personas this tick who reposted/liked/replied to a `seed: true` row
- `seedReachCumulative` — same but across all ticks ≤ 3
- `skepticPushback` — count of `reply` actions this tick where the persona's `beliefs.skepticism > 0.5` (look up bio from personas.json)

For `scenario == "polarization"`: `scenarioMetrics` should include:
- `inGroupEngagement` — actions where actor and target have `partisanship` of the same sign
- `crossGroupEngagement` — actions where signs differ

For other scenarios, include any obvious aggregate metrics that fit.

Append the resulting JSON object as **one line** to
`runs/run-2026-04-25T01-45/metrics.jsonl` (create the file if absent).

## Step 3 — Update the running report

Append a section to `vault/reports/misinfo.md`. Create the file with a
header on tick 1 if it doesn't exist; otherwise append. Format:

```markdown
## Tick 3

- Total actions: <N>
- Action histogram: post=N, repost=N, reply=N, like=N, follow=N, nothing=N
- Unique actors: <N>

**Scenario-specific:** <one-paragraph plain-English read of the
`scenarioMetrics` for this tick — what's actually happening in the network.>

**Notable activity this tick:**
- <bullet: most reposted post or biggest engagement, with the text>
- <bullet: any flip in someone's behavior — e.g. a previously-quiet skeptic
  finally replying>

```

Keep the prose tight: 3–5 bullets per tick.

## Step 4 — Write the Obsidian-vault tick note

Write `vault/runs/run-2026-04-25T01-45/ticks/tick-3.md`. This is the
human-navigable view of what happened in this tick.

```markdown
---
tags: [tick, run/run-2026-04-25T01-45, tick/3, scenario/misinfo]
tick: 3
run_id: run-2026-04-25T01-45
scenario: misinfo
total_actions: <N>
unique_actors: <N>
---

# Tick 3

**Scenario:** [[../../../reports/misinfo|misinfo]] · Run:
[[../overview|run-2026-04-25T01-45]]

## Action Histogram
- `post`: N
- `repost`: N
- `reply`: N
- `like`: N
- `follow`: N
- `nothing`: N

## Per-Persona Actions
_(one bullet per persona this tick — link the action note for each.)_

- [[p001]] → [[t3-p001-<action>]]
- [[p002]] → [[t3-p002-<action>]]
- ...

## Scenario Read
<the same one-paragraph read you wrote in vault/reports/misinfo.md>

## Notable
- <bullets — same content as the report>

## See Also
- Previous: (if this is not tick 1, link `[[tick-NN]]` for the prior tick;
  otherwise omit this bullet)
- Next: (if this is not the final tick, write `_(pending)_` to be filled in
  by the next tick's analyze)
- [[../overview|Run overview]]
```

## Step 5 — Update the run overview

Edit `vault/runs/run-2026-04-25T01-45/overview.md`. The `## Ticks` section was
written by 010-setup with placeholder `_(pending)_` markers. Replace the
entry for THIS tick (`3`) with a link + one-line summary:

```markdown
## Ticks
- [[tick-01]] — <one-line summary>
- [[tick-02]] — <one-line summary, or _(pending)_ if not yet run>
- [[tick-03]] — _(pending)_
```

Use `python3` or `sed` to do the replacement; do not regenerate the
whole overview from scratch.

## Constraints

- Use Python via Bash for JSON computation. Do not eyeball-count.
- Do not edit personas.json, graph.json, or timeline.jsonl.
- Do not invoke any non-existent tooling — this playbook is purely
  file-driven; there is no `pnpm sim` to call.
- Do not regenerate vault notes that already exist (persona notes,
  prior tick notes, prior action notes). Only write the tick note for
  THIS tick and update the overview.
