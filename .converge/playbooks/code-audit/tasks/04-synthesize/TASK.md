---
id: 04-synthesize
title: Assemble the three audit outputs into one PR review comment

depends_on:
  - 01-audit-commits
  - 02-audit-docs-drift
  - 03-audit-code

inputs:
  - ".converge/playbooks/code-audit/output/audit-commits.md"
  - ".converge/playbooks/code-audit/output/audit-docs-drift.md"
  - ".converge/playbooks/code-audit/output/audit-code.md"

outputs:
  - ".converge/playbooks/code-audit/output/review.md"

checks:
  - id: file
    cmd: "test -s .converge/playbooks/code-audit/output/review.md"
    description: combined review.md exists and is non-empty
  - id: contains-sections
    cmd: "grep -qE '^## (Commits|Code|Docs)' .converge/playbooks/code-audit/output/review.md || grep -qE '^LGTM' .converge/playbooks/code-audit/output/review.md"
    description: contains audit sections or is a single LGTM
---

Combine the three audit outputs into one markdown comment the human will
read on the PR. The inputs are already structured; your job is assembly,
not re-judgement.

Read:

- `.converge/playbooks/code-audit/output/audit-code.md` — code review
- `.converge/playbooks/code-audit/output/audit-commits.md` — commit lint
- `.converge/playbooks/code-audit/output/audit-docs-drift.md` — docs drift

**If all three are clean**, write `LGTM` as the entire body. Clean means:

- `audit-code.md` is exactly `LGTM`
- `audit-commits.md` ends with `OVERALL: PASS`
- `audit-docs-drift.md` is exactly `No documented sources affected.`

**Otherwise**, write `.converge/playbooks/code-audit/output/review.md` as:

```
## Code

<paste audit-code.md verbatim if it has findings; omit this section if it is LGTM>

## Commits

<paste audit-commits.md table verbatim if OVERALL: FAIL; omit if PASS>

## Docs

<paste audit-docs-drift.md verbatim if drift detected; omit if "No documented sources affected.">
```

Omit any section whose audit was clean. Do not re-summarise — paste each
audit's body as-is so the human sees exactly what each auditor produced.
