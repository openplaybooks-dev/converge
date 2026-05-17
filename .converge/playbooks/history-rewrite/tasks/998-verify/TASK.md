---
id: 998-verify
title: Lint the rewritten history in the working repo
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
  - id: conventional-commits
    cmd: |
      bad=$(git log --all --pretty=%s \
        | grep -cvE '^(feat|fix|docs|refactor|test|chore|build|ci|perf|style|revert)(\([a-z0-9._/-]+\))?: .+')
      test "$bad" = "0"
  - id: fsck-clean
    cmd: |
      out=$(git fsck --full 2>&1 | grep -vE '^(Checking|Verifying|dangling)' | grep -E 'error|missing|broken' || true)
      test -z "$out"
  - id: no-large-blobs
    cmd: |
      large=$(git rev-list --objects --all \
        | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' \
        | awk '$1=="blob" && $3 > 5000000 {print}' | wc -l | tr -d ' ')
      test "$large" = "0"
  - id: commit-count-preserved
    cmd: |
      live=$(git log --all --pretty=%H | wc -l | tr -d ' ')
      mapped=$(jq 'keys | length' .converge/playbooks/history-rewrite/data/message-map.json)
      test "$live" = "$mapped"
---

# Verify the rewritten history

Pure checks — no body work. If any fails, the playbook halts here and `999-publish` will not run.

```bash
echo "[verify] all checks declared above; framework will evaluate."
```

## What each check enforces

- **single-author**: exactly one identity, and it's Luc Van Minh.
- **no-forbidden-tokens**: typos (`drivent`, `jounal`, `improvemet`, ...) and noise (`WIP`, `stash`, `Merge branch`) are gone.
- **conventional-commits**: every subject matches the conventional-commits regex.
- **fsck-clean**: the repository is internally consistent.
- **no-large-blobs**: no file >5MB slipped in (the user manually split heavy examples before running; this is the safety net if one was missed).
- **commit-count-preserved**: the number of live commits matches the number of entries in the message map (no commits were accidentally dropped by filter-repo).
