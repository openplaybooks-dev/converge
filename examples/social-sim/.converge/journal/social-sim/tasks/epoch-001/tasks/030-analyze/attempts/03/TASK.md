# Task: epoch-001/030-analyze

# Tick 1 — Analyze

Compute the metrics for this tick and update the running report.

## Step 1 — Read this tick's actions

Read `runs/run-2026-04-25T01-45/timeline.jsonl`. Filter to rows where
`tick == 1` (this tick only — earlier ticks are already
analyzed). You should see one row per persona.

## Step 2 — Compute per-tick metrics

A JSON object with these fields (use Python or jq via Bash; do not hand-count):

```json
{
  "tick": 1,
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
- `seedReachCumulative` — same but across all ticks ≤ 1
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
## Tick 1

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

Write `vault/runs/run-2026-04-25T01-45/ticks/tick-1.md`. This is the
human-navigable view of what happened in this tick.

```markdown
---
tags: [tick, run/run-2026-04-25T01-45, tick/1, scenario/misinfo]
tick: 1
run_id: run-2026-04-25T01-45
scenario: misinfo
total_actions: <N>
unique_actors: <N>
---

# Tick 1

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

- [[p001]] → [[t1-p001-<action>]]
- [[p002]] → [[t1-p002-<action>]]
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
entry for THIS tick (`1`) with a link + one-line summary:

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