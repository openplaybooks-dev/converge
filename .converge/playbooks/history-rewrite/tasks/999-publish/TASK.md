---
id: 999-publish
title: Force-push the rewritten history to origin
passthrough: true
confirm: true
checks:
  - id: remote-matches-local
    cmd: |
      local=$(git rev-parse HEAD)
      remote=$(git ls-remote origin refs/heads/main | awk '{print $1}')
      test "$local" = "$remote"
---

# Publish: force-push to origin

**This task is irreversible.** It overwrites `origin/main` with the rewritten history and deletes stale `claude/*` remote branches. Open PRs against the old `main` will be orphaned; anyone with a local clone must re-clone.

Guarded by `confirm: true` — the framework will not run this task without explicit user approval, even after `998-verify` passes.

```bash
set -euo pipefail

git push --force-with-lease origin main

# Prune stale claude/* remote branches
for ref in $(git ls-remote --heads origin 'claude/*' | awk '{print $2}'); do
  branch="${ref#refs/heads/}"
  echo "[publish] deleting stale remote branch: $branch"
  git push origin --delete "$branch" || true
done

echo "[publish] done. New HEAD at $(git rev-parse HEAD)"
```
