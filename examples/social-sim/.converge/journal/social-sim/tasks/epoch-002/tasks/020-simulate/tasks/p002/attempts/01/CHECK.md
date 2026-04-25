# Checks: epoch-002/020-simulate/p002

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## action-appended
**Description**: Exactly one timeline row exists for tick=2 personaId=p002
**Command**: `python3 -c "import json,sys; lines=[json.loads(l) for l in open('runs/run-2026-04-25T01-45/timeline.jsonl') if l.strip()]; hits=[l for l in lines if l.get('tick')==2 and l.get('personaId')=='p002']; sys.exit(0 if len(hits)==1 else 1)"
`

## action-valid
**Description**: Recorded action is one of post/repost/reply/like/follow/nothing
**Command**: `python3 -c "import json,sys; lines=[json.loads(l) for l in open('runs/run-2026-04-25T01-45/timeline.jsonl') if l.strip()]; hits=[l for l in lines if l.get('tick')==2 and l.get('personaId')=='p002']; r=hits[0] if hits else {}; sys.exit(0 if r.get('action') in ['post','repost','reply','like','follow','nothing'] else 1)"
`

## vault-action-note
**Description**: Vault action note exists for this tick × persona
**Command**: `ls vault/runs/run-2026-04-25T01-45/actions/t2-p002-*.md 2>/dev/null | head -1 | grep -q .
`