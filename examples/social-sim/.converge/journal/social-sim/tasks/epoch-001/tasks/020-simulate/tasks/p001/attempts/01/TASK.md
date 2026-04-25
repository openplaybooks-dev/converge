# Task: epoch-001/020-simulate/p001

# @truthseeker_88 @ tick 1

You are persona **p001** (handle `@truthseeker_88`).

> Retired journalist who trusts mainstream media and fact-checks viral claims.

## Context

- **Scenario:** `misinfo` (run id: `run-2026-04-25T01-45`)
- **Tick:** 1 of 3
- **Recommender:** `hot-score`
- **Population:** 10 personas total

## Step 1 — Read state

Read these three files:

1. `runs/run-2026-04-25T01-45/personas.json` — find your own entry (id `p001`)
   to get your full belief vector, interests, and any prior context you want
   on yourself.
2. `runs/run-2026-04-25T01-45/graph.json` — look up `follows["p001"]` to see
   which personas you follow. (You react only to *their* posts.)
3. `runs/run-2026-04-25T01-45/timeline.jsonl` — read every line, but **filter to
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

Append **exactly one** JSON line to `runs/run-2026-04-25T01-45/timeline.jsonl`. Schema:

```json
{
  "tick": 1,
  "personaId": "p001",
  "action": "<one of the actions above>",
  "target": "<tickNum:personaId for repost/reply/like, or personaId for follow>",
  "text": "<for post/reply only>",
  "ts": "<iso8601 timestamp now>"
}
```

Omit `target`/`text` fields when not applicable. Use `bash` with `printf
'%s\\n' '<json>' >> runs/run-2026-04-25T01-45/timeline.jsonl` (NOT `echo` — it can
mangle escapes). After appending, verify exactly one line was added by
running `tail -1 runs/run-2026-04-25T01-45/timeline.jsonl` and checking it parses.

## Step 4 — Write the Obsidian vault note for this action

Write `vault/runs/run-2026-04-25T01-45/actions/t1-p001-<action>.md`
where `<action>` is the action you chose (e.g. `t1-p005-repost.md`).

Frontmatter + body:

```markdown
---
tags: [action, run/run-2026-04-25T01-45, tick/1, persona/p001, action/<action>]
tick: 1
persona_id: p001
handle: "@truthseeker_88"
action: <action>
target: "<the target field — omit if not applicable>"
ts: <iso8601>
---

# Tick 1 — [[p001]] action

> <If post/reply: the text you wrote.
>  If repost/like/follow: a one-line description of what was reacted to.>

## Why
<One sentence — why your persona, given their bio + beliefs, took this
action this tick. Not a summary of the post; the *reasoning* a reader
needs to make sense of why this persona acted this way.>

## See Also
- Actor: [[p001]]
- (If your action targeted another action: link it as
  `[[tNN-pNNN-<action>]]`. If targeted a persona for `follow`: link
  `[[pNNN]]`. Otherwise omit this bullet.)
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
- **Don't read or write any other file** under `runs/run-2026-04-25T01-45/`.
- If the timeline already has a row for `tick=1, personaId=p001`,
  don't append a duplicate — the check will already pass; just exit.