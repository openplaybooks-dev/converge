# Needs: epoch-003/020-simulate/p005

## Description

One persona × one tick. Read your bio, your timeline (posts from accounts you follow, from prior ticks ONLY), and the scenario context. Decide ONE action. Append it to runs/run-2026-04-25T01-45/timeline.jsonl.


## Inputs

- `runs/run-2026-04-25T01-45/personas.json`
- `runs/run-2026-04-25T01-45/graph.json`
- `runs/run-2026-04-25T01-45/timeline.jsonl`

## Expected Outputs

- `runs/run-2026-04-25T01-45/timeline.jsonl`
- `vault/runs/run-2026-04-25T01-45/actions/t3-p005-*.md`

## Checks

- **action-appended**: Exactly one timeline row exists for tick=3 personaId=p005
- **action-valid**: Recorded action is one of post/repost/reply/like/follow/nothing
- **vault-action-note**: Vault action note exists for this tick × persona
