#!/usr/bin/env bash
# Rewrites every commit's message and unifies the author to Luc Van Minh.
# Reads message map from ../data/message-map.json (relative to script dir).
# Prefers git-filter-repo, falls back to git filter-branch.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAP="$SCRIPT_DIR/../data/message-map.json"
test -s "$MAP" || { echo "ERROR: message-map.json missing at $MAP" >&2; exit 1; }

if command -v git-filter-repo >/dev/null 2>&1; then
  REWRITER=filter-repo
else
  REWRITER=filter-branch
fi
echo "[rewrite] using $REWRITER"
echo "[rewrite] map: $MAP"
echo "[rewrite] cwd: $(pwd)"
echo "[rewrite] HEAD before: $(git rev-parse HEAD)"

if [ "$REWRITER" = "filter-repo" ]; then
  # filter-repo wraps the callback as `def callback(commit, metadata): <body>`.
  # So the body below must be statements only — no top-level `def`.
  # The map gets loaded fresh on each commit (22KB JSON, ~thousandths of a sec).
  CALLBACK=$(cat <<PYEOF
import json
with open("$MAP") as _f:
    _m = json.load(_f)
sha = commit.original_id.decode()
new_msg = _m.get(sha)
# Always normalize author/committer. Rewrite the message only if mapped;
# unmapped commits (HEAD or stragglers) keep their original message.
if new_msg is not None:
    commit.message = (new_msg + "\n").encode()
commit.author_name = b"Luc Van Minh"
commit.author_email = b"luk.mink@gmail.com"
commit.committer_name = b"Luc Van Minh"
commit.committer_email = b"luk.mink@gmail.com"
PYEOF
)
  git filter-repo --force --commit-callback "$CALLBACK"
else
  export FILTER_BRANCH_SQUELCH_WARNING=1
  git filter-branch --force \
    --env-filter '
      export GIT_AUTHOR_NAME="Luc Van Minh"
      export GIT_AUTHOR_EMAIL="luk.mink@gmail.com"
      export GIT_COMMITTER_NAME="Luc Van Minh"
      export GIT_COMMITTER_EMAIL="luk.mink@gmail.com"
    ' \
    --msg-filter "
      sha=\"\$GIT_COMMIT\"
      new=\$(jq -r --arg s \"\$sha\" '.[\$s] // empty' '$MAP')
      if [ -z \"\$new\" ]; then
        echo \"ERROR: no message-map entry for \$sha\" >&2
        exit 1
      fi
      printf '%s\n' \"\$new\"
    " \
    --tag-name-filter cat \
    -- --all
fi

echo "[rewrite] done. HEAD after: $(git rev-parse HEAD)"
