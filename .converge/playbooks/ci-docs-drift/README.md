# ci-docs-drift

A Converge playbook that flags documentation pages whose `sources:`
frontmatter points at code that has changed in the current PR. The
`docs-drift.yml` workflow runs this whenever a PR touches `docs/**`,
`packages/**/*.ts`, or related config.

## Inputs (provided by CI)

| Path                                          | Source                                              |
| --------------------------------------------- | --------------------------------------------------- |
| `.converge/inputs/changed-source-files.txt`   | `gh pr view <number> --json files \| jq -r ...`     |

## Output

`output/drift-report.md` — either `No documented sources affected.` or a
structured report listing the doc pages that need updates.

## How drift is defined

A doc page is considered drifted when its `sources:` frontmatter lists a
file that changed in the PR **and** the documented behaviour no longer
matches the current code. The agent reads both the source and the doc
page to decide, then proposes a concrete fix.

## Run locally

```bash
git diff HEAD~5 --name-only \
  | grep -E '^(packages/.*\.(ts|md)|docs/)' \
  > .converge/inputs/changed-source-files.txt
pnpm converge run --playbook=ci-docs-drift --max-duration=10m
```
