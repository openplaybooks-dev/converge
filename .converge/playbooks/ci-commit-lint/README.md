# ci-commit-lint

A Converge playbook that lints every commit in a PR against the convention
in `CLAUDE.md` §5 and proposes corrected messages. The playbook ships as
v1; the live `commit-lint.yml` workflow only enforces the **title** regex
deterministically. Wiring this playbook in for full-commit linting is a
v2 follow-up.

## Inputs (CI will provide)

| Path                                | Source                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `.converge/inputs/commit-msgs.txt`  | `git log <base>..<head> --pretty=format:'%h %s%n%b%n---'`              |

## Output

`output/lint-verdict.md` — a markdown table, one row per commit, ending
with an `OVERALL: PASS|FAIL` line the workflow can grep.

## Run locally

```bash
git log HEAD~5..HEAD --pretty=format:'%h %s%n%b%n---' \
  > .converge/inputs/commit-msgs.txt
pnpm converge run --playbook=ci-commit-lint --max-duration=10m
```
