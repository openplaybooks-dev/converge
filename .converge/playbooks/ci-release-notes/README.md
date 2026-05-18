# ci-release-notes

A Converge playbook that drafts release notes from the commits between
two tags. The `release-notes.yml` workflow runs this on every
`release: published` event and overwrites the GitHub release body with
the result.

## Inputs (provided by CI)

| Path                                  | Source                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------- |
| `.converge/inputs/commit-msgs.txt`    | `git log $PREV..$NEW --pretty=format:'%h %s%n%b%n---'`                 |
| `.converge/inputs/changed-files.txt`  | `git diff --name-only $PREV..$NEW`                                     |
| `.converge/inputs/prev-tag.txt`       | `git describe --tags --abbrev=0 HEAD^`                                 |
| `.converge/inputs/new-tag.txt`        | `${{ github.event.release.tag_name }}`                                 |

## Output

`output/release-notes.md` — a markdown document the workflow uploads via
`gh release edit --notes-file`.

## Run locally

```bash
PREV=$(git describe --tags --abbrev=0 HEAD^)
NEW=$(git describe --tags --abbrev=0 HEAD)
git log "$PREV".."$NEW" --pretty=format:'%h %s%n%b%n---' \
  > .converge/inputs/commit-msgs.txt
git diff --name-only "$PREV".."$NEW" > .converge/inputs/changed-files.txt
echo "$PREV" > .converge/inputs/prev-tag.txt
echo "$NEW"  > .converge/inputs/new-tag.txt
pnpm converge run --playbook=ci-release-notes --max-duration=10m
```
