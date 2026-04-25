---
id: p005
title: "@local_politics_fan @ tick 1"
description: "One persona × one tick. Read your bio, your timeline (posts from accounts you follow, from prior ticks ONLY), and the scenario context. Decide ONE action. Append it to runs/run-001/timeline.jsonl.\n"
inputs:
  - runs/run-001/personas.json
  - runs/run-001/graph.json
  - runs/run-001/timeline.jsonl
outputs:
  - runs/run-001/timeline.jsonl
  - "vault/runs/run-001/actions/t1-p005-*.md"
checks:
  - id: action-appended
    description: Exactly one timeline row exists for tick=1 personaId=p005
    cmd: "python3 -c \"import json,sys; lines=[json.loads(l) for l in open('runs/run-001/timeline.jsonl') if l.strip()]; hits=[l for l in lines if l.get('tick')==1 and l.get('personaId')=='p005']; sys.exit(0 if len(hits)==1 else 1)\"\n"
  - id: action-valid
    description: Recorded action is one of post/repost/reply/like/follow/nothing
    cmd: "python3 -c \"import json,sys; lines=[json.loads(l) for l in open('runs/run-001/timeline.jsonl') if l.strip()]; hits=[l for l in lines if l.get('tick')==1 and l.get('personaId')=='p005']; r=hits[0] if hits else {}; sys.exit(0 if r.get('action') in ['post','repost','reply','like','follow','nothing'] else 1)\"\n"
  - id: vault-action-note
    description: Vault action note exists for this tick × persona
    cmd: "ls vault/runs/run-001/actions/t1-p005-*.md 2>/dev/null | head -1 | grep -q .\n"
vars:
  taskId: p005
  tick: 1
  tickNum: 1
  runId: run-001
  scenario: misinfo
  recommender: hot-score
  populationSize: 10
  steps: 3
  seed: 42
  personaId: p005
  personaHandle: "@local_politics_fan"
  personaBio: Community organizer focused on hyperlocal politics and grassroots engagement.
  action: 
---

# @local_politics_fan @ tick 1

You are persona **p005** (handle `@local_politics_fan`).

> Community organizer focused on hyperlocal politics and grassroots engagement.

## Context

- **Scenario:** `misinfo` (run id: `run-001`)
- **Tick:** 1 of 3
- **Recommender:** `hot-score`
- **Population:** 10 personas total

## Step 1 — Read state

Read these three files:

1. `runs/run-001/personas.json` — find your own entry (id `p005`)
   to get your full belief vector, interests, and any prior context you want
   on yourself.
2. `runs/run-001/graph.json` — look up `follows["p005"]` to see
   which personas you follow. (You react only to *their* posts.)
3. `runs/run-001/timeline.jsonl` — read every line, but **filter to
   entries with `tick < 1`** (you cannot react to actions taken
   THIS tick). Among those, prioritize entries where `personaId` is in your
   follow list, plus any `seed: true` entries (they're public).

## Step 2 — Decide one action

Choose exactly one of:

| Action     | Required fields                                          |
|------------|----------------------------------------------------------|
| `post`     | `text` (string, ≤ 200 chars)                             |
| `repost`   | `target` (a prior `personaId`'s post — quote the row by `tick:personaId`) |
| `reply`    | `target` + `text` (≤ 200 chars)                          |
| `like`     | `target`                                                 |
| `follow`   | `target` (a `personaId` you don't already follow)        |
| `nothing`  | (no extra fields) — explicit no-op tick                  |

Pick what your persona would actually do given your bio, beliefs, and what
you just read on your timeline. **Be in character.** A skeptic should not
boost a misinformation post. A partisan should engage with congruent
content. If nothing on your feed warrants action, return `nothing`.

For `misinfo`: skeptics frequently `reply` to challenge or `nothing`;
believers frequently `repost` or `like`; on-the-fence may `reply` asking
for sources.

## Step 3 — Append to timeline

Append **exactly one** JSON line to `runs/run-001/timeline.jsonl`. Schema:

```json
{
  "tick": 1,
  "personaId": "p005",
  "action": "<one of the actions above>",
  "target": "<tickNum:personaId for repost/reply/like, or personaId for follow>",
  "text": "<for post/reply only>",
  "ts": "<iso8601 timestamp now>"
}
```

Omit `target`/`text` fields when not applicable. Use `bash` with `printf
'%s\\n' '<json>' >> runs/run-001/timeline.jsonl` (NOT `echo` — it can
mangle escapes). After appending, verify exactly one line was added by
running `tail -1 runs/run-001/timeline.jsonl` and checking it parses.

## Step 4 — Write the Obsidian vault note for this action

Write `vault/runs/run-001/actions/t1-p005-<action>.md`
where `<action>` is the action you chose (e.g. `t1-p005-repost.md`).

Frontmatter + body:

```markdown
---
tags: [action, run/run-001, tick/1, persona/p005, action/<action>]
tick: 1
persona_id: p005
handle: "@local_politics_fan"
action: <action>
target: "<the target field — omit if not applicable>"
ts: <iso8601>
---

# Tick 1 — [[p005]] d

> <If post/reply: the text you wrote.
>  If repost/like/follow: a one-line description of what was reacted to.>

## Why
<One sentence — why your persona, given their bio + beliefs, took this
action this tick. Not a summary of the post; the *reasoning* a reader
needs to make sense of why this persona acted this way.>

## See Also
- Actor: [[p005]]
- {{If target is an action: [[t<targetTick>-<targetPersonaId>-<targetAction>]] }}
- {{If target is a persona (follow): [[<targetPersonaId>]] }}
- [[tick-1|Tick 1]]
```

Substitute the actual values. Do NOT leave `<...>` placeholders in the
file — fill them in. The `Why` paragraph is the most important part for
human reading: it's what makes the run inspectable.

## Constraints

- **One row only.** No multi-action turns.
- **No state mutation outside `timeline.jsonl`.** Don't edit personas.json
  or graph.json — `010-setup` owns those. (A `follow` action is *recorded*
  in the timeline; the graph itself is the static seed.)
- **Don't read or write any other file** under `runs/run-001/`.
- If the timeline already has a row for `tick=1, personaId=p005`,
  don't append a duplicate — the check will already pass; just exit.
