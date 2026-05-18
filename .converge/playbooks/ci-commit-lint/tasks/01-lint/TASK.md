---
id: 01-lint
title: Lint commits in the PR against CLAUDE.md §5

inputs:
  - ".converge/inputs/commit-msgs.txt"
  - "CLAUDE.md"

outputs:
  - ".converge/playbooks/ci-commit-lint/output/lint-verdict.md"

checks:
  - id: verdict-exists
    cmd: "test -s .converge/playbooks/ci-commit-lint/output/lint-verdict.md"
    description: lint-verdict.md exists
  - id: verdict-line
    cmd: "grep -qE '^OVERALL: (PASS|FAIL)' .converge/playbooks/ci-commit-lint/output/lint-verdict.md"
    description: file ends with an OVERALL line (PASS or FAIL)
---

Read `.converge/inputs/commit-msgs.txt`. Each commit is rendered as:

```
<sha> <subject>
<body, possibly multi-line>
---
```

For every commit, judge whether the subject matches the convention in
`CLAUDE.md` §5:

- Format: `type(scope): subject`
- `type` ∈ {`feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `revert`}
- `scope` is optional but if present must be lowercase, slash-or-dash separated
- `subject` is lowercase, imperative, no trailing period, soft-wrap at 72 chars

If the commit has a body, check it explains **why** rather than restating
**what** the diff already shows.

Write `.converge/playbooks/ci-commit-lint/output/lint-verdict.md` as:

```
| SHA      | Original                            | Verdict | Suggested                         |
| -------- | ----------------------------------- | ------- | --------------------------------- |
| abc1234  | Fixed thing                         | FAIL    | fix(scope): correct the thing     |
| def5678  | feat(core): add retry budget        | PASS    | —                                 |

OVERALL: PASS
```

The `OVERALL:` line must be `PASS` if every commit verdict is `PASS`,
otherwise `FAIL`. The workflow reads this line to set its status.
