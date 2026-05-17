---
id: t{{tickNum}}-{{personaId}}
title: "{{personaHandle}} @ tick {{tick}}"
description: >-
  One persona × one tick. Read your bio, your feed (posts from accounts
  you follow, prior ticks only), and the scenario context. Decide ONE
  action. Append it to runs/{{runId}}/timeline.jsonl, write feed +
  action + (if applicable) post vault notes.
vars:
  personaId: "{{personaId}}"
  personaHandle: "{{personaHandle}}"
  personaBio: "{{personaBio}}"
  tick: "{{tick}}"
  tickNum: "{{tickNum}}"
  runId: "{{runId}}"
  scenario: "{{scenario}}"
  populationSize: "{{populationSize}}"
  recommender: "{{recommender}}"
  rngSeed: "{{rngSeed}}"
  steps: "{{steps}}"
inputs:
  - "runs/{{runId}}/personas.json"
  - "runs/{{runId}}/graph.json"
  - "runs/{{runId}}/timeline.jsonl"
outputs:
  - "runs/{{runId}}/timeline.jsonl"
  - "vault/runs/{{runId}}/feeds/{{personaId}}/tick-{{tickNum}}.md"
  - "vault/runs/{{runId}}/actions/t{{tickNum}}-{{personaId}}-*.md"
checks:
  - id: action-appended
    cmd: >-
      python3 -c "import json,sys;
      lines=[json.loads(l) for l in open('runs/{{runId}}/timeline.jsonl') if l.strip()];
      hits=[l for l in lines if l.get('tick')=={{tickNum}} and l.get('personaId')=='{{personaId}}'];
      sys.exit(0 if len(hits)==1 else 1)"
    description: "Exactly one timeline row for tick={{tickNum}} personaId={{personaId}}"
  - id: action-valid
    cmd: >-
      python3 -c "import json,sys;
      lines=[json.loads(l) for l in open('runs/{{runId}}/timeline.jsonl') if l.strip()];
      r=next((l for l in lines if l.get('tick')=={{tickNum}} and l.get('personaId')=='{{personaId}}'), {});
      sys.exit(0 if r.get('action') in ['post','repost','reply','like','follow','nothing'] else 1)"
    description: "Action is one of post/repost/reply/like/follow/nothing"
  - id: feed-snapshot-written
    cmd: "test -f vault/runs/{{runId}}/feeds/{{personaId}}/tick-{{tickNum}}.md"
    description: "Feed snapshot for this persona × tick exists"
  - id: action-note-written
    cmd: >-
      ls vault/runs/{{runId}}/actions/t{{tickNum}}-{{personaId}}-*.md 2>/dev/null
      | head -1 | grep -q .
    description: "Action vault note exists"
---

# {{personaHandle}} @ tick {{tick}}

You are persona **{{personaId}}** (handle `{{personaHandle}}`).

> {{personaBio}}

**Tick:** {{tick}} of {{steps}} · **Run:** `{{runId}}` · **Scenario:** `{{scenario}}` · **Recommender:** `{{recommender}}`

## Step 1 — Read state

1. `runs/{{runId}}/personas.json` — find your own entry (id `{{personaId}}`) for your full beliefs + interests.
2. `runs/{{runId}}/graph.json` — `follows["{{personaId}}"]` = personas you follow.
3. `runs/{{runId}}/timeline.jsonl` — **filter to rows with `tick < {{tickNum}}`** (you cannot react to actions taken THIS tick). Among those, prioritize rows whose `personaId` is in your follow list, plus all `seed: true` rows (public).

## Step 2 — Write your feed snapshot

Compute YOUR view of the network at the start of this tick. Write `vault/runs/{{runId}}/feeds/{{personaId}}/tick-{{tickNum}}.md` (create the directory if needed):

```markdown
---
tags: [feed, run/{{runId}}, persona/{{personaId}}, tick/{{tickNum}}]
persona_id: {{personaId}}
tick: {{tickNum}}
recommender: {{recommender}}
---

# Feed for [[../../personas/{{personaId}}|{{personaId}}]] @ tick {{tickNum}}

Recommender: `{{recommender}}`

## Posts visible to you (ranked by recommender)

- [[../../../posts/t0-seed-001]] — `<truncated text>` _(by [[../../../personas/<personaId>]], tick 0, seed)_
- ...show ~5–10 posts...

## Notes
<One sentence: what stands out in your feed this tick.>
```

Ranking by recommender:
- `random` — deterministic by `hash({{rngSeed}}, {{personaId}}, {{tickNum}})`
- `hot-score` — `(reposts + replies + likes) / (1 + tick - postTick)`
- `embedding` — overlap between your `interests` and the post's keywords (string-match for now)

## Step 3 — Decide ONE action

| Action | Required fields |
|---|---|
| `post` | `text` (≤200 chars) |
| `repost` | `target` (id of a prior post) |
| `reply` | `target` + `text` (≤200 chars) |
| `like` | `target` |
| `follow` | `target` (a `personaId` you don't already follow) |
| `nothing` | — |

Be in character. Skeptics shouldn't boost misinformation; partisans engage congruent content; on-the-fence ask for sources. If nothing on your feed warrants action, return `nothing`.

For `misinfo`: skeptics frequently `reply` to challenge or `nothing`; believers frequently `repost` or `like`; on-the-fence may `reply` asking for sources.

## Step 4 — Append to timeline

Append ONE JSON line to `runs/{{runId}}/timeline.jsonl`:

```json
{
  "id": "t{{tickNum}}-{{personaId}}-<action>",
  "tick": {{tickNum}},
  "personaId": "{{personaId}}",
  "action": "<action>",
  "target": "<target id, omit if N/A>",
  "text": "<text for post/reply, omit otherwise>",
  "ts": "<iso8601 now>"
}
```

Use `printf '%s\n' '<json>' >> runs/{{runId}}/timeline.jsonl` (NOT `echo` — escapes). Verify the line parses by running `tail -1 runs/{{runId}}/timeline.jsonl | python3 -c "import json,sys; json.loads(sys.stdin.read())"`.

## Step 5 — Write the action vault note

`vault/runs/{{runId}}/actions/t{{tickNum}}-{{personaId}}-<action>.md`:

```markdown
---
tags: [action, run/{{runId}}, tick/{{tickNum}}, persona/{{personaId}}, action/<action>]
tick: {{tickNum}}
persona_id: {{personaId}}
handle: "{{personaHandle}}"
action: <action>
target: "<target>"
ts: <iso8601>
---

# Tick {{tickNum}} — [[../personas/{{personaId}}|{{personaHandle}}]]: <action>

> <If post/reply: your text. If repost/like/follow: one line describing what you reacted to.>

## Why
<One sentence — why your persona, given your bio + beliefs + what you read on your feed, took this action. This is the most important part for human reading.>

## See Also
- Actor: [[../personas/{{personaId}}]]
- Feed: [[../feeds/{{personaId}}/tick-{{tickNum}}|My feed @ tick {{tickNum}}]]
- _(if reply/repost/like: target post — `[[../posts/<target>]]`)_
- _(if follow: target persona — `[[../personas/<targetId>]]`)_
- [[../ticks/tick-{{tick}}|Tick {{tickNum}}]]
```

Substitute the actual values. Do NOT leave `<...>` placeholders in the file — fill them in.

## Step 6 — If action is `post`: write the post vault note

If you chose `post`, ALSO write `vault/runs/{{runId}}/posts/t{{tickNum}}-{{personaId}}-post.md`:

```markdown
---
tags: [post, run/{{runId}}, tick/{{tickNum}}, persona/{{personaId}}, action/post]
post_id: t{{tickNum}}-{{personaId}}-post
tick: {{tickNum}}
author: {{personaId}}
ts: <iso8601>
---

# Post by [[../personas/{{personaId}}|{{personaHandle}}]] @ tick {{tickNum}}

> <your post text>

## Reactions
_(populated by later persona-tick tasks as they repost / reply / like this post)_

## See Also
- Author: [[../personas/{{personaId}}]]
- [[../ticks/tick-{{tick}}|Tick {{tickNum}}]]
```

## Step 7 — If action targets another post: append to that post's Reactions

If you reposted / replied / liked a target post (id like `t<N>-pNNN-post` or `t0-seed-NNN`), append one line under `## Reactions` in `vault/runs/{{runId}}/posts/<target>.md`:

```
- [[../actions/t{{tickNum}}-{{personaId}}-<action>]] — [[../personas/{{personaId}}|{{personaHandle}}]] <action>ed at tick {{tickNum}}
```

Use Python or `sed` to insert the line **after** the `## Reactions` header — do NOT rewrite the file from scratch.

## Constraints

- **One row only.** No multi-action turns.
- **No state mutation outside `timeline.jsonl` + the listed vault files.** Don't edit `personas.json` or `graph.json`.
- If `timeline.jsonl` already has a row for `tick={{tickNum}}, personaId={{personaId}}`, don't duplicate — the check will already pass; exit.
- Do NOT invoke `pnpm sim` or any other non-existent tooling. The playbook IS the simulator.
