---
id: 001-troubleshooting-index
title: Write docs/troubleshooting/index.md
inputs:
  - docs/_internal
  - skills/converge-control/troubleshooting/playbook.md
outputs:
  - docs/troubleshooting/index.md
checks:
  - id: page-exists
    cmd: "test -f docs/troubleshooting/index.md"
    description: page exists
  - id: page-frontmatter
    cmd: "head -10 docs/troubleshooting/index.md | grep -q '^title:' && head -10 docs/troubleshooting/index.md | grep -q '^sources:'"
    description: title + sources frontmatter
  - id: lists-most-symptoms
    cmd: "test $(grep -cE '^\\s*-\\s+\\[|^\\*\\s+\\[|^[0-9]+\\.\\s+\\[' docs/troubleshooting/index.md) -ge 10"
    description: lists at least 10 symptom entries
  - id: links-to-read-the-journal
    cmd: "grep -qE '/guides/read-the-journal|\\.\\./guides/read-the-journal' docs/troubleshooting/index.md"
    description: links to the read-the-journal guide
---

# Write `docs/troubleshooting/index.md`

The Troubleshooting index. The reader lands here in distress, scans for
their symptom, clicks through to the detail page.

## Required frontmatter

```yaml
---
title: "Troubleshooting"
description: "Symptom-indexed fixes for run-blockers we know how to solve."
sources:
  - docs/_internal
  - skills/converge-control/troubleshooting/playbook.md
sidebar:
  order: 0
---
```

## Required structure

### Top of page (1 paragraph)

"Symptom-indexed fixes for run-blockers we know how to solve. Each entry
is symptom → root cause → fix recipe → verification. If your symptom
isn't here, see [Read the journal](/guides/read-the-journal) and surface
the failing task ID, exact log lines, and what you've tried."

### Quick index

A numbered list of every symptom in `docs/_internal`, in
manifest order. Each entry:

```markdown
1. [Iteration cap reached](/troubleshooting/iteration-cap-reached) —
   `Max iterations (N) reached. Use --max-iterations to increase.`
```

The one-line summary after the link is the symptom shape — pull it from
the page's frontmatter `description` (or, if you can't, from the source
playbook's `**Symptom (exact):**` block).

### When NONE of these match

A short section mirroring the "When NONE of these match" tail of
`skills/converge-control/troubleshooting/playbook.md`:

1. **Stop the run.** Don't keep killing/relaunching with no plan.
2. **Read the per-task journal forensics** — link to
   [Read the journal](/guides/read-the-journal).
3. **Surface the failing task ID, exact log lines, what you've tried,
   your hypothesis, and a proposed fix** (to a maintainer / on the
   issue tracker).
4. Wait for review before applying any patch.

## Read first

- `docs/_internal` — the canonical symptom list.
- `skills/converge-control/troubleshooting/playbook.md` — for the
  one-line symptom summaries.

## Banned

- Inventing symptoms not in the manifest.
- Inlining the full fix recipe — that's what the per-symptom page is
  for. Index entries are one line each.
- A long preamble. The reader is in distress; get them to their
  symptom.
