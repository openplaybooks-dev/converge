---
id: "{{taskId}}"
title: "Claim RFC number and index — epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/index/result.json"
checks:
  - id: index-result-recorded
    cmd: "node .converge/playbooks/rfc-ideation/scripts/jq-safe.mjs -e '.outcome != null' {{artifactsRel}}/index/result.json"
    description: Index result recorded
  - id: drafted-rfc-exists-when-needed
    cmd: "node .converge/playbooks/rfc-ideation/scripts/jq-safe.mjs -e 'if .outcome == \"indexed\" then (.rfc_number != null and .rfc_path != null) else true end' {{artifactsRel}}/index/result.json"
    description: When indexed, RFC number and path are recorded
  - id: rfc-file-on-disk
    cmd: "node .converge/playbooks/rfc-ideation/scripts/jq-safe.mjs -e 'if .outcome == \"indexed\" then .rfc_path else null end' {{artifactsRel}}/index/result.json | xargs -I{} test -s {{projectDir}}/{}"
    description: When indexed, the docs/rfcs/NNNN-*.md file exists
---

# Claim RFC number and update index

If the draft is empty (triage short-circuited), write:

```json
{"outcome":"skipped","reason":"no-draft","rfc_number":null,"rfc_path":null}
```

and exit cleanly.

Otherwise, atomically assign the next RFC number and rename the draft into
`docs/rfcs/NNNN-<slug>.md`.

## Script

```sh
node {{projectDir}}/.converge/playbooks/rfc-ideation/scripts/claim-next-rfc-number.mjs \
  --draft {{artifactsRel}}/draft/draft.md \
  --triage {{artifactsRel}}/triage/triage.json \
  --rfcs-dir {{projectDir}}/docs/rfcs \
  --lock {{artifactsRootRel}}/numbers.lock \
  --out {{artifactsRel}}/index/result.json
```

The script:

1. Acquires `flock` on `--lock` (waits up to 30 seconds).
2. Reads `docs/rfcs/[0-9]*-*.md`, finds `max(N)`, computes `N+1` zero-padded
   to 4 digits.
3. Derives slug from triage candidate hash (first 8 chars of sha1) — or, if
   the title is short and meaningful, kebab-cases the title.
4. Renames the draft to `docs/rfcs/NNNN-<slug>.md`.
5. Appends a row to `docs/rfcs/README.md` priority queue under the section
   matching `priority_tier` frontmatter.
6. Releases the lock.
7. Writes:

```json
{
  "outcome": "indexed",
  "rfc_number": "0023",
  "rfc_slug": "ab12cd34",
  "rfc_path": "docs/rfcs/0023-ab12cd34.md",
  "priority_tier": "tier2",
  "type": "feat"
}
```

## Back-pressure check

Before claiming, the script counts RFCs with `status: accepted` AND no
implementing PR yet (no branch matching `rfc/NNNN-*` on remote). If the
count exceeds 10, the script writes:

```json
{"outcome":"backpressure","accepted_pending_count":11,"reason":"acceptance queue overloaded"}
```

and exits with status code 1. This fails the epoch and signals humans to
catch up before more drafts are produced.
