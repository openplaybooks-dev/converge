---
id: 100-rewrite-history
title: Rewrite every commit's message and unify the author
passthrough: true
checks:
  - id: single-author
    cmd: |
      test "$(git log --all --pretty='%an <%ae>' | sort -u | wc -l | tr -d ' ')" = "1" \
        && test "$(git log --all --pretty='%an <%ae>' | sort -u)" = "Luc Van Minh <luk.mink@gmail.com>"
  - id: messages-applied
    cmd: |
      # Sample 5 mapped SHAs and assert their subjects match the map.
      # We compare the rewritten commit's first-parent ancestry by index, since
      # SHAs change after rewrite. Instead we check that every live subject
      # appears as a value in the map.
      missing=0
      while IFS= read -r subj; do
        jq -e --arg s "$subj" 'any(.[]; . == $s)' \
          .converge/playbooks/history-rewrite/data/message-map.json >/dev/null \
          || { echo "subject not in map: $subj"; missing=$((missing+1)); }
      done < <(git log --all --pretty=%s)
      test "$missing" = "0"
  - id: no-forbidden-tokens
    cmd: |
      ! git log --all --pretty=%s \
        | grep -iE 'WIP|stash|Merge branch|drivent|jounal|improvemet|translaction|improvemnt|imporve|exlude' \
        | grep -q .
---

# Rewrite all commit messages and unify the author

Uses `git filter-repo` (preferred) or `git filter-branch` (fallback) to walk every commit and:

1. Replace its subject with the value from `seeds/message-map.json[<sha>]`.
2. Replace its author and committer with `Luc Van Minh <luk.mink@gmail.com>`.
3. Leave the tree state untouched.

The original `..origin/main` ref and any local refs are preserved; the rewrite happens in place. The backup mirror at `../converge-backup-*.git` is the only safety net — verify it's intact (the 000-precheck task did this).

```bash
set -euo pipefail

MAP=.converge/playbooks/history-rewrite/data/message-map.json
test -s "$MAP" || { echo "ERROR: message-map.json missing" >&2; exit 1; }

# Prefer git-filter-repo (fast, modern, recommended by git itself).
if command -v git-filter-repo >/dev/null 2>&1; then
  REWRITER=filter-repo
else
  REWRITER=filter-branch
fi
echo "[rewrite] using $REWRITER"

if [ "$REWRITER" = "filter-repo" ]; then
  cat > /tmp/converge-rewrite.py <<'PY'
import json, os, sys
MAP_PATH = ".converge/playbooks/history-rewrite/data/message-map.json"
with open(MAP_PATH) as f:
    MSG_MAP = json.load(f)

def commit_callback(commit, metadata):
    sha = commit.original_id.decode()
    new_msg = MSG_MAP.get(sha)
    if new_msg is None:
        # Strict mode: every commit must be mapped.
        sys.stderr.write(f"ERROR: no message-map entry for {sha}\n")
        sys.exit(1)
    commit.message = (new_msg + "\n").encode()
    commit.author_name = b"Luc Van Minh"
    commit.author_email = b"luk.mink@gmail.com"
    commit.committer_name = b"Luc Van Minh"
    commit.committer_email = b"luk.mink@gmail.com"
PY
  git filter-repo --force --commit-callback "$(cat /tmp/converge-rewrite.py)"
else
  # filter-branch fallback. Slower; uses env-filter for author + msg-filter for message.
  export FILTER_BRANCH_SQUELCH_WARNING=1
  git filter-branch --force \
    --env-filter '
      export GIT_AUTHOR_NAME="Luc Van Minh"
      export GIT_AUTHOR_EMAIL="luk.mink@gmail.com"
      export GIT_COMMITTER_NAME="Luc Van Minh"
      export GIT_COMMITTER_EMAIL="luk.mink@gmail.com"
    ' \
    --msg-filter '
      sha="$GIT_COMMIT"
      new=$(jq -r --arg s "$sha" ".[\$s] // empty" .converge/playbooks/history-rewrite/data/message-map.json)
      if [ -z "$new" ]; then
        echo "ERROR: no message-map entry for $sha" >&2
        exit 1
      fi
      printf "%s\n" "$new"
    ' \
    --tag-name-filter cat \
    -- --all
fi

echo "[rewrite] done. New HEAD: $(git rev-parse HEAD)"
```
