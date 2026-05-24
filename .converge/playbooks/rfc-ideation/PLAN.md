# PLAN — rfc-ideation

## Mission

Autonomously draft RFCs that the human reviewer can accept or reject. Each
epoch reads from four sources, picks one candidate via weighted round-robin,
expands it into a full RFC following the established template, verifies all
cited file:line references against the current tree, and writes the draft to
`docs/rfcs/NNNN-<slug>.md` with `status: draft`.

The human gate is the `status` frontmatter field. Humans edit Draft → Accepted.
The sibling `rfc-shipping` playbook picks up Accepted RFCs and ships them.

## Architecture

```
discover-sources → pick-source → triage → draft → cite-check → index
       │                                                          │
       │ candidates.jsonl   selected.json   triage.json            │
       │                                                          │
       └──── source-cursor.jsonl (weighted round-robin state) ◀───┘
```

Durable state:

```text
.converge/artifacts/rfc-ideation/
  source-cursor.jsonl      # last-picked-epoch per source (round-robin state)
  backlog.jsonl            # deferred candidates, dedup-skipped items
  journal.md               # human-readable history
  numbers.lock             # flock target for atomic RFC number assignment
  epochs/<NNN>/
    discover/candidates.jsonl
    pick/selected.json
    triage/triage.json
    draft/draft-<slug>.md     # staged before number assignment
    cite-check/cite-report.json
    index/rfc-number.txt
    epoch-summary.md
```

## Source priority and starvation

Four sources, weighted round-robin (not strict priority):

| Source | Weight | Provider |
|---|---|---|
| Open GitHub issues | 3 | `gh issue list --state open --json number,title,body` |
| `docs/ideas/*.md` | 2 | filesystem |
| `backlog.jsonl` | 2 | own ledger of deferred / stale-demoted candidates |
| Code-discovered findings | 1 | design-principle audit against `packages/` (see task 01-discover-sources) |

Effective weight = base weight × `max(1, epochs_since_last_pick / 3)`. So if
the issue queue is hot but ideas haven't been picked in 9 epochs, ideas
overtake. This survives a 100-issue backlog without starving the other lanes.

## Numbering protocol

RFC numbers are NOT assigned at draft time. The draft writes to
`docs/rfcs/draft-<slug>.md` where `slug = sha1(source_ref)[:8]`. The `index`
task (06) acquires `flock` on `.converge/artifacts/rfc-ideation/numbers.lock`,
finds `max(N) + 1` across `docs/rfcs/[0-9]*-*.md`, renames the draft to
`docs/rfcs/NNNN-<slug>.md`, and appends a row to `docs/rfcs/README.md`.

Two parallel epochs may both draft simultaneously without collision; only
one can hold the flock at a time during index step.

## Back-pressure

If `docs/rfcs/*.md` count with `status: accepted` exceeds 10 → the `index`
task fails the epoch with an `authoring`-class error. This means humans are
not accepting fast enough; ideation should pause until the queue drains.

## Citation discipline

Every `path:line` reference in a draft RFC must exist at draft time. The
`cite-check` task parses citations from the draft body and verifies each one.
If any miss → the draft is rejected and the epoch reruns. This prevents
LLM-hallucinated line numbers, which are common.

## Guardrails

- No edits outside `docs/rfcs/`, `docs/ideas/`, and
  `.converge/artifacts/rfc-ideation/`. No source modifications.
- No `any`, no `@ts-ignore` in any generated content.
- New-API RFCs (`type: feat` + adds public surface) must cite an issue or
  idea — no agent-invented APIs.
- Breaking RFCs (`type: breaking`) must include `migration_plan`.
- Deprecation RFCs must include `deprecation_window`.

## Running

```sh
converge run --playbook=rfc-ideation --select ideate+
```

Recommended cadence: hourly, with bounded sessions. The ledger artifacts make
restarts cheap.
