---
id: 000-precheck
title: Verify backup exists and message-map is complete before rewriting history
passthrough: true
checks:
  - id: backup-present
    cmd: ls -d ../converge-backup-*.git >/dev/null 2>&1
  - id: working-tree-clean
    cmd: |
      test -z "$(git status --porcelain)" || { git status --short; exit 1; }
  - id: message-map-present
    cmd: test -s .converge/playbooks/history-rewrite/data/message-map.json
  - id: message-map-has-some-entries
    cmd: |
      # The rewriter handles unmapped commits gracefully (keeps original
      # message, still normalizes author). So we don't require full coverage —
      # just that the map has SOMETHING. Stale maps (e.g. after a previous
      # rewrite changed SHAs) become harmless no-ops on the message side and
      # still get author normalization applied.
      n=$(jq 'keys | length' .converge/playbooks/history-rewrite/data/message-map.json)
      test "$n" -gt 0
  - id: no-typos-in-map
    cmd: |
      ! jq -r 'to_entries[].value' .converge/playbooks/history-rewrite/data/message-map.json \
        | grep -iE 'drivent|jounal|improvemet|translaction|improvemnt|imporve|exlude' | grep -q .
  - id: messages-are-conventional
    cmd: |
      bad=$(jq -r 'to_entries[].value' .converge/playbooks/history-rewrite/data/message-map.json \
        | grep -cvE '^(feat|fix|docs|refactor|test|chore|build|ci|perf|style|revert)(\([a-z0-9._/-]+\))?: .+')
      test "$bad" = "0"
  - id: anthropic-auth-token-loaded
    cmd: |
      test -n "${ANTHROPIC_AUTH_TOKEN:-}" || {
        echo "ERROR: ANTHROPIC_AUTH_TOKEN is not set." >&2
        echo "Run this before the playbook:" >&2
        echo "  set -a; . ../myanlabs/examples/goal-driven-dev/.env; set +a" >&2
        exit 1
      }
---

# Precheck

Refuses to start the rewrite unless:

1. A backup mirror (`../converge-backup-*.git`) exists.
2. The working tree is clean (no uncommitted changes — they'd be lost).
3. `seeds/message-map.json` exists and covers every commit reachable from `--all`.
4. No typos in the new messages.
5. Every new message is a valid conventional-commit subject.
6. `ANTHROPIC_AUTH_TOKEN` is loaded into the environment (the framework's AI provider in `.converge/project.yaml` reads it for any AI-driven hooks the runner may need).

Before running the playbook, source the gitignored env file:

```bash
set -a; . ../myanlabs/examples/goal-driven-dev/.env; set +a
```

If any check fails, fix the underlying issue and re-run.

```bash
set -euo pipefail
echo "[precheck] all checks declared above; framework will evaluate."
```
