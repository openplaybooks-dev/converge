---
id: "{{taskId}}"
title: "{{personaHandle}} @ tick {{tick}}"
description: >
  One persona × one tick. Read your bio, your timeline (posts from accounts
  you follow, from prior ticks ONLY), and the scenario context. Decide ONE
  action. Append it to runs/{{runId}}/timeline.jsonl.
vars:
  personaId:
  personaHandle:
  personaBio:
  tick:
  tickNum:
  runId:
  scenario:
  populationSize:
  recommender:
  seed:
  steps:
inputs:
  - "runs/{{runId}}/personas.json"
  - "runs/{{runId}}/graph.json"
  - "runs/{{runId}}/timeline.jsonl"
outputs:
  - "runs/{{runId}}/timeline.jsonl"
  - "vault/runs/{{runId}}/actions/t{{tickNum}}-{{personaId}}-*.md"
checks:
  - id: action-appended
    cmd: >
      python3 -c "import json,sys;
      lines=[json.loads(l) for l in open('runs/{{runId}}/timeline.jsonl') if l.strip()];
      hits=[l for l in lines if l.get('tick')=={{tickNum}} and l.get('personaId')=='{{personaId}}'];
      sys.exit(0 if len(hits)==1 else 1)"
    description: "Exactly one timeline row exists for tick={{tickNum}} personaId={{personaId}}"
  - id: action-valid
    cmd: >
      python3 -c "import json,sys;
      lines=[json.loads(l) for l in open('runs/{{runId}}/timeline.jsonl') if l.strip()];
      hits=[l for l in lines if l.get('tick')=={{tickNum}} and l.get('personaId')=='{{personaId}}'];
      r=hits[0] if hits else {};
      sys.exit(0 if r.get('action') in ['post','repost','reply','like','follow','nothing'] else 1)"
    description: "Recorded action is one of post/repost/reply/like/follow/nothing"
  - id: vault-action-note
    cmd: >
      ls vault/runs/{{runId}}/actions/t{{tickNum}}-{{personaId}}-*.md 2>/dev/null
      | head -1 | grep -q .
    description: "Vault action note exists for this tick × persona"
---

# {{personaHandle}} @ tick {{tick}}

You are persona **{{personaId}}** (handle `{{personaHandle}}`).

> {{personaBio}}

## Context

- **Scenario:** `{{scenario}}` (run id: `{{runId}}`)
- **Tick:** {{tick}} of {{steps}}
- **Recommender:** `{{recommender}}`
- **Population:** {{populationSize}} personas total

## Step 1 — Read state

Read these three files:

1. `runs/{{runId}}/personas.json` — find your own entry (id `{{personaId}}`)
   to get your full belief vector, interests, and any prior context you want
   on yourself.
2. `runs/{{runId}}/graph.json` — look up `follows["{{personaId}}"]` to see
   which personas you follow. (You react only to *their* posts.)
3. `runs/{{runId}}/timeline.jsonl` — read every line, but **filter to
   entries with `tick < {{tickNum}}`** (you cannot react to actions taken
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

Append **exactly one** JSON line to `runs/{{runId}}/timeline.jsonl`. Schema:

```json
{
  "tick": {{tickNum}},
  "personaId": "{{personaId}}",
  "action": "<one of the actions above>",
  "target": "<tickNum:personaId for repost/reply/like, or personaId for follow>",
  "text": "<for post/reply only>",
  "ts": "<iso8601 timestamp now>"
}
```

Omit `target`/`text` fields when not applicable. Use `bash` with `printf
'%s\\n' '<json>' >> runs/{{runId}}/timeline.jsonl` (NOT `echo` — it can
mangle escapes). After appending, verify exactly one line was added by
running `tail -1 runs/{{runId}}/timeline.jsonl` and checking it parses.

## Step 4 — Write the Obsidian vault note for this action

Write `vault/runs/{{runId}}/actions/t{{tickNum}}-{{personaId}}-<action>.md`
where `<action>` is the action you chose (e.g. `t1-p005-repost.md`).

Frontmatter + body:

```markdown
---
tags: [action, run/{{runId}}, tick/{{tickNum}}, persona/{{personaId}}, action/<action>]
tick: {{tickNum}}
persona_id: {{personaId}}
handle: "{{personaHandle}}"
action: <action>
target: "<the target field — omit if not applicable>"
ts: <iso8601>
---

# Tick {{tickNum}} — [[{{personaId}}]] action

> <If post/reply: the text you wrote.
>  If repost/like/follow: a one-line description of what was reacted to.>

## Why
<One sentence — why your persona, given their bio + beliefs, took this
action this tick. Not a summary of the post; the *reasoning* a reader
needs to make sense of why this persona acted this way.>

## See Also
- Actor: [[{{personaId}}]]
- (If your action targeted another action: link it as
  `[[tNN-pNNN-<action>]]`. If targeted a persona for `follow`: link
  `[[pNNN]]`. Otherwise omit this bullet.)
- [[tick-{{tick}}|Tick {{tickNum}}]]
```

Substitute the actual values. Do NOT leave `<...>` placeholders in the
file — fill them in. The `Why` paragraph is the most important part for
human reading: it's what makes the run inspectable.

## Constraints

- **One row only.** No multi-action turns.
- **No state mutation outside `timeline.jsonl`.** Don't edit personas.json
  or graph.json — `010-setup` owns those. (A `follow` action is *recorded*
  in the timeline; the graph itself is the static seed.)
- **Don't read or write any other file** under `runs/{{runId}}/`.
- If the timeline already has a row for `tick={{tickNum}}, personaId={{personaId}}`,
  don't append a duplicate — the check will already pass; just exit.
