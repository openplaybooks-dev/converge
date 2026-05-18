---
id: 01-review
title: Review the PR diff and write a structured verdict

inputs:
  - ".converge/inputs/pr-diff.patch"
  - ".converge/inputs/pr-meta.json"
  - ".converge/inputs/changed-files.json"
  - "CLAUDE.md"

outputs:
  - ".converge/playbooks/ci-pr-review/output/review.md"

checks:
  - id: output-nonempty
    cmd: "test -s .converge/playbooks/ci-pr-review/output/review.md"
    description: review.md exists and is non-empty
  - id: output-shape
    cmd: "grep -qE '^(## Summary|LGTM)' .converge/playbooks/ci-pr-review/output/review.md"
    description: starts with a Summary heading or LGTM
---

Read the diff at `.converge/inputs/pr-diff.patch` and the PR metadata at
`.converge/inputs/pr-meta.json`. Use `.converge/inputs/changed-files.json`
to focus your review on files that actually changed.

Review the change against `CLAUDE.md` and these dimensions:

1. **Correctness** — does the diff do what its description claims? Any obvious
   bugs, off-by-ones, missed null checks, or wrong assumptions about callers?
2. **Test coverage** — for each meaningful code path added or changed, is
   there a corresponding test? Flag gaps where the change touches behaviour
   that isn't covered.
3. **CLAUDE.md adherence** — focus especially on §3 (surgical changes —
   no drive-by edits to adjacent code) and §3.5 (no project-specific
   strings leaking into `packages/`).
4. **API surface** — any breaking change to a `packages/*/src/index.ts`
   export? Call it out explicitly so a maintainer can decide whether the
   semver bump is right.

Write the review to `.converge/playbooks/ci-pr-review/output/review.md`.
The output must be a single markdown document that a maintainer can paste
into the PR conversation. If the diff is clean, the entire body should be
the literal line `LGTM`. Otherwise use this shape:

```
## Summary

<one paragraph: what this PR does and your overall verdict>

## Blockers

- <issue that should be fixed before merge — empty section if none>

## Suggestions

- <improvement that would be nice but isn't blocking>

## Nits

- <stylistic or trivially small remark>
```

Keep the review proportional to the diff. A 10-line typo fix should not
receive a 200-line review. Drop empty sections rather than padding them
with "N/A".
