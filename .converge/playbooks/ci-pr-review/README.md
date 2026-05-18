# ci-pr-review

A Converge playbook that reviews a GitHub pull request and writes a
structured verdict to `output/review.md`. The `pr-review.yml` workflow
runs this on every PR and posts the output as a comment.

## Inputs (provided by CI)

| Path                                     | Source                                              |
| ---------------------------------------- | --------------------------------------------------- |
| `.converge/inputs/pr-diff.patch`         | `gh pr diff <number>`                               |
| `.converge/inputs/pr-meta.json`          | `gh pr view <number> --json title,body,author`      |
| `.converge/inputs/changed-files.json`    | `gh pr view <number> --json files`                  |

## Output

`output/review.md` — the comment body. Either the literal string `LGTM`
or a structured markdown report with Summary / Blockers / Suggestions /
Nits sections.

## Run locally

```bash
git diff HEAD~5 HEAD > .converge/inputs/pr-diff.patch
echo '{"title":"test","body":"local dry run","author":{"login":"me"}}' \
  > .converge/inputs/pr-meta.json
git diff HEAD~5 --name-only | jq -R . | jq -s '{files: map({path: .})}' \
  > .converge/inputs/changed-files.json
pnpm converge run --playbook=ci-pr-review --max-duration=10m
```

## Iterating on the prompt

The review prompt lives in `tasks/01-review/TASK.md`. Open a PR editing
that file and the next CI run will use the new prompt. The bot is itself
a contribution surface.
