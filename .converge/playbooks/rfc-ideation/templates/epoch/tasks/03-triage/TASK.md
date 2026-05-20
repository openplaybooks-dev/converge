---
id: "{{taskId}}"
title: "Triage candidate against existing RFCs — epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/triage/triage.json"
checks:
  - id: triage-decision-valid
    cmd: "node .converge/playbooks/rfc-ideation/scripts/jq-safe.mjs -e '.decision == \"draft\" or .decision == \"dedup-skip\" or .decision == \"invalid\"' {{artifactsRel}}/triage/triage.json"
    description: Triage decision is one of draft|dedup-skip|invalid
  - id: dedup-skip-names-match
    cmd: "node .converge/playbooks/rfc-ideation/scripts/jq-safe.mjs -e 'if .decision == \"dedup-skip\" then .matched_rfc != null else true end' {{artifactsRel}}/triage/triage.json"
    description: dedup-skip outcomes name the matched existing RFC
  - id: invalid-has-reason
    cmd: "node .converge/playbooks/rfc-ideation/scripts/jq-safe.mjs -e 'if .decision == \"invalid\" then .reason != null else true end' {{artifactsRel}}/triage/triage.json"
    description: invalid outcomes record a reason
---

# Triage candidate against existing RFCs

Read `{{artifactsRel}}/pick/selected.json` (from task 02) and dedup it against
`docs/rfcs/*.md`.

## Algorithm

```sh
node {{projectDir}}/.converge/playbooks/rfc-ideation/scripts/dedup-against-rfcs.mjs \
  --selected {{artifactsRel}}/pick/selected.json \
  --rfcs-dir {{projectDir}}/docs/rfcs \
  --out {{artifactsRel}}/triage/triage.json
```

The script:

1. Reads the selected candidate's `summary` and `body`.
2. Computes a normalized hash (lowercase, strip code blocks and punctuation,
   keep meaningful words).
3. For each `docs/rfcs/[0-9]*-*.md`, parses frontmatter and computes the same
   normalized hash on the Problem section.
4. If any existing RFC has Jaccard similarity > 0.5 on word sets, flags it as
   `dedup-skip` with `matched_rfc: "NNNN-slug"`.
5. Otherwise checks validity:
   - body must be ≥ 50 chars
   - summary must be ≥ 10 chars
   - source ref must parse (`issue#N`, `docs/ideas/*.md`, etc.)
6. Writes `triage.json`:

```json
{
  "decision": "draft" | "dedup-skip" | "invalid",
  "candidate": <full selected row>,
  "matched_rfc": "0007-distributed-workers" | null,
  "reason": "body too short" | null,
  "proposed_type": "fix" | "feat" | "refactor" | "chore" | "deprecation" | "breaking",
  "proposed_priority_tier": "critical" | "tier0" | "tier1" | "tier2" | "tier3"
}
```

## Proposing type and tier

The triage step proposes — the draft step refines. Heuristics:

- Issue labeled `bug` → `type: fix`, `priority_tier: tier1` default
- Issue labeled `enhancement` → `type: feat`, `priority_tier: tier2`
- Source `code-finding` with severity `high` → `type: fix`, `priority_tier: tier0`
- Source `idea` → `type: feat`, default `priority_tier: tier2`
- Source `backlog` → preserve original classification if present

## Short-circuits

If `decision: dedup-skip`, append a line to
`{{artifactsRootRel}}/backlog.jsonl`:

```json
{"id":"<source>:<ref>","status":"dedup-skipped","matched":"<matched_rfc>","epoch":"{{epoch}}"}
```

If `decision: invalid`, append:

```json
{"id":"<source>:<ref>","status":"invalid","reason":"<reason>","epoch":"{{epoch}}"}
```

Downstream tasks (04, 05, 06) short-circuit when `decision != "draft"` by
producing minimal artifacts and not modifying `docs/rfcs/`.
