---
id: "{{prefix}}-{{slug}}"
title: "Troubleshooting: {{title}}"
description: "Symptom-indexed fix for: {{title}}"
inputs:
  - skills/converge-control/troubleshooting/playbook.md
outputs:
  - "{{pagePath}}"
checks:
  - id: page-exists
    cmd: "test -f {{pagePath}}"
    description: page exists
  - id: page-frontmatter
    cmd: "head -10 {{pagePath}} | grep -q '^title:' && head -10 {{pagePath}} | grep -q '^sources:'"
    description: title + sources frontmatter
  - id: page-has-symptom-section
    cmd: "grep -qiE '^##\\s+symptom' {{pagePath}}"
    description: page has a Symptom section
  - id: page-has-fix-section
    cmd: "grep -qiE '^##\\s+(fix|recipe|solution)' {{pagePath}}"
    description: page has a Fix / Recipe / Solution section
  - id: page-has-verification
    cmd: "grep -qiE '^##\\s+verif' {{pagePath}}"
    description: page has a Verification section
---

# Troubleshooting page: `{{slug}}`

Write `{{pagePath}}` documenting the troubleshooting recipe for symptom
**#{{number}} — {{title}}**.

The canonical source is `skills/converge-control/troubleshooting/playbook.md`,
section starting at line {{sourceLine}}. Read that section verbatim and
adapt it into a docs page with the structure below.

## Required frontmatter

```yaml
---
title: "{{title}}"
description: "<one-line description of the symptom this page fixes>"
sources:
  - skills/converge-control/troubleshooting/playbook.md
sidebar:
  label: "{{number}}. {{title}}"
  order: {{number}}
---
```

## Required structure (in order)

### Symptom

The exact log line, error, or shape the reader matches against. Quote
verbatim from the source (use the `**Symptom (exact):**` block from
`skills/converge-control/troubleshooting/playbook.md` section
#{{number}}).

If the source uses a fenced code block for the symptom text, preserve it.

### Root cause

One paragraph adapted from the `**Root cause:**` line in the source.
Stay concrete; don't generalize.

### Fix

The recipe from the source. Numbered steps, code blocks tagged with
language. Preserve the order and the exact commands.

If the source has multiple options (Option A / Option B), preserve that
structure and explain when to pick each.

### Verification

How to confirm the fix worked. Adapted from the `**Verification:**` line
in the source.

### Prevention (optional)

Only include if the source has a `**Prevention**` block. Verbatim or
tightly paraphrased.

### Related

1-3 links — cross-references to other troubleshooting pages or to the
[Read the journal](/guides/read-the-journal) guide if the fix involves
journal forensics.

## Read first

- `skills/converge-control/troubleshooting/playbook.md` around line
  {{sourceLine}} — the canonical source for this symptom. Match it
  faithfully.

## Banned

- Inventing symptoms or fixes that aren't in the source. The cross-validate
  phase will catch drift.
- Softening the source's warnings. If the source says "**Never** use
  `--restart` mid-project", say it just as bluntly here.
- Adding new sections beyond the contract. Symptom / Root cause / Fix /
  Verification / (optional Prevention) / Related — that's the shape.
- Linking to internal converge-control skill files. The reader is in
  user-facing docs; cross-link only to other docs pages.
