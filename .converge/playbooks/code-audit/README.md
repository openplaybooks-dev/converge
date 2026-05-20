# code-audit

Standalone PR auditor. Runs three audits in parallel against a pull request
— commit messages, docs drift, code review — and synthesizes one combined
markdown comment for the human reviewer. Advisory only; never gates merge.

The `code-audit.yml` workflow runs this on every PR and posts the synthesized
report as a comment.

## DAG

```
01-audit-commits   ─┐
02-audit-docs-drift ┼─▶ 04-synthesize ─▶ output/review.md
03-audit-code       ─┘
```

The three audits run in parallel and write their own outputs. Synthesis
assembles them into one comment, omitting any section whose audit was clean.

## Inputs (materialised by CI)

| Path                                           | Source                                                       |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `.converge/inputs/pr-diff.patch`               | `gh pr diff <number>`                                        |
| `.converge/inputs/pr-meta.json`                | `gh pr view <number> --json title,body,author,...`           |
| `.converge/inputs/changed-files.json`          | `gh pr view <number> --json files`                           |
| `.converge/inputs/commit-msgs.txt`             | `git log <base>..<head> --pretty=…`                          |
| `.converge/inputs/changed-source-files.txt`    | filtered subset of changed files (packages/docs only)        |

## Outputs

| File                                              | Produced by         |
| ------------------------------------------------- | ------------------- |
| `output/audit-commits.md`                         | `01-audit-commits`  |
| `output/audit-docs-drift.md`                      | `02-audit-docs-drift` |
| `output/audit-code.md`                            | `03-audit-code`     |
| `output/review.md`                                | `04-synthesize` — the comment body posted to the PR |

## Iterating on the prompts

Each audit's prompt lives in `tasks/<id>/TASK.md`. Open a PR editing the
prompt you want to change and the next CI run uses the new version. The
auditor is itself a contribution surface.
