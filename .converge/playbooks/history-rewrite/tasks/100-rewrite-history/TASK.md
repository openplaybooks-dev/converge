---
id: 100-rewrite-history
title: Rewrite every commit's message and unify the author
passthrough: true
checks:
  - id: single-author
    cmd: |
      test "$(git log --all --pretty='%an <%ae>' | sort -u | wc -l | tr -d ' ')" = "1" \
        && test "$(git log --all --pretty='%an <%ae>' | sort -u)" = "Luc Van Minh <luk.mink@gmail.com>"
  - id: no-forbidden-tokens
    cmd: |
      ! git log --all --pretty=%s \
        | grep -iE 'WIP|stash|Merge branch|drivent|jounal|improvemet|translaction|improvemnt|imporve|exlude' \
        | grep -q .
---

# Rewrite all commit messages and unify the author

Calls `scripts/rewrite.sh`, which uses `git filter-repo` (preferred) or
`git filter-branch` (fallback) to walk every commit and:

1. Replace its subject with the value from `data/message-map.json[<sha>]`.
2. Replace its author and committer with `Luc Van Minh <luk.mink@gmail.com>`.
3. Leave the tree state untouched.

The original `..origin/main` ref and any local refs are preserved; the rewrite happens in place. The backup mirror at `../converge-backup-*.git` is the only safety net — verified by the 000-precheck task.

```bash
bash .converge/playbooks/history-rewrite/scripts/rewrite.sh
```
