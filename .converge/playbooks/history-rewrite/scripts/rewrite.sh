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

echo "[rewrite] message+author pass done. HEAD: $(git rev-parse HEAD)"

# Second pass: strip the heavy/domain-specific example paths from every commit's
# tree. The directories were moved to ../myanlabs/ in a prior commit, but old
# commits still reference their content as large blobs, bloating .git/.
if [ "$REWRITER" = "filter-repo" ]; then
  echo "[rewrite] starting path-strip pass for heavy examples..."
  git filter-repo --force \
    --invert-paths \
    --path examples/unity-mono-remix \
    --path examples/unity-remix \
    --path examples/baby-app \
    --path examples/goal-driven-dev \
    --path examples/game-assets-3d \
    --path examples/stitch-to-flutter-baby-watch-v2 \
    --path examples/game-assets-video \
    --path examples/converge-design \
    --path examples/game-assets \
    --path examples/stitch-to-flutter-baby-watch \
    --path examples/financial-deep-research \
    --path examples/agentic-calculator \
    --path examples/stitch-to-flutter \
    --path examples/cinematic-video-production \
    --path examples/game-assets-3d-meshy \
    --path examples/autonomous-pentest
  echo "[rewrite] running gc to reclaim space..."
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive 2>&1 | tail -3
fi

echo "[rewrite] path-strip done."

# Third pass: scrub known leaked secrets from every blob in history.
# Reads patterns from $SCRIPT_DIR/../data/secrets-redact.txt (one
# `literal==>replacement` pattern per line; gitignored so secrets aren't
# committed). If the file is absent the pass is skipped (cleaner-state run).
SECRETS="$SCRIPT_DIR/../data/secrets-redact.txt"
if [ "$REWRITER" = "filter-repo" ] && [ -s "$SECRETS" ]; then
  echo "[rewrite] starting secret-redaction pass..."
  git filter-repo --force --replace-text "$SECRETS"
  echo "[rewrite] running final gc..."
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive 2>&1 | tail -3
else
  echo "[rewrite] no secrets-redact.txt found at $SECRETS, skipping redaction pass"
fi

echo "[rewrite] all done. final HEAD: $(git rev-parse HEAD)"
