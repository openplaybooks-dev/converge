# Needs: epoch-001/020-simulate/p009

## Description

One persona × one tick. Read your bio, your timeline (posts from accounts you follow, from prior ticks ONLY), and the scenario context. Decide ONE action. Append it to runs/run-001/timeline.jsonl.


## Inputs

- `runs/run-001/personas.json`
- `runs/run-001/graph.json`
- `runs/run-001/timeline.jsonl`

## Expected Outputs

- `runs/run-001/timeline.jsonl`
- `vault/runs/run-001/actions/t1-p009-*.md`

## Checks

- **action-appended**: Exactly one timeline row exists for tick=1 personaId=p009
- **action-valid**: Recorded action is one of post/repost/reply/like/follow/nothing
- **vault-action-note**: Vault action note exists for this tick × persona
