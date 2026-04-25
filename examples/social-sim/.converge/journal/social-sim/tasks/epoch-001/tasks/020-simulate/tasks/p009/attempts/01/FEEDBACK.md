# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **action-appended**
- ❌ **action-valid**
- ❌ **vault-action-note**

## ❌ action-appended

**Command**: `python3 -c "import json,sys; lines=[json.loads(l) for l in open('runs/run-2026-04-25T01-45/timeline.jsonl') if l.strip()]; hits=[l for l in lines if l.get('tick')==1 and l.get('personaId')=='p009']; sys.exit(0 if len(hits)==1 else 1)"
`
**Exit code**: 1
**Output**:
```
Command failed: python3 -c "import json,sys; lines=[json.loads(l) for l in open('runs/run-2026-04-25T01-45/timeline.jsonl') if l.strip()]; hits=[l for l in lines if l.get('tick')==1 and l.get('personaId')=='p009']; sys.exit(0 if len(hits)==1 else 1)"
```

## ❌ action-valid

**Command**: `python3 -c "import json,sys; lines=[json.loads(l) for l in open('runs/run-2026-04-25T01-45/timeline.jsonl') if l.strip()]; hits=[l for l in lines if l.get('tick')==1 and l.get('personaId')=='p009']; r=hits[0] if hits else {}; sys.exit(0 if r.get('action') in ['post','repost','reply','like','follow','nothing'] else 1)"
`
**Exit code**: 1
**Output**:
```
Command failed: python3 -c "import json,sys; lines=[json.loads(l) for l in open('runs/run-2026-04-25T01-45/timeline.jsonl') if l.strip()]; hits=[l for l in lines if l.get('tick')==1 and l.get('personaId')=='p009']; r=hits[0] if hits else {}; sys.exit(0 if r.get('action') in ['post','repost','reply','like','follow','nothing'] else 1)"
```

## ❌ vault-action-note

**Command**: `ls vault/runs/run-2026-04-25T01-45/actions/t1-p009-*.md 2>/dev/null | head -1 | grep -q .
`
**Exit code**: 1
**Output**:
```
Command failed: ls vault/runs/run-2026-04-25T01-45/actions/t1-p009-*.md 2>/dev/null | head -1 | grep -q .
```
