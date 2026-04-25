# FEEDBACK.md — Check Results

**Status**: ❌ 7/7 check(s) failed

- ❌ **personas-present**
- ❌ **personas-count**
- ❌ **graph-present**
- ❌ **graph-valid**
- ❌ **timeline-file-exists**
- ❌ **vault-overview**
- ❌ **vault-persona-notes**

## ❌ personas-present

**Command**: `test -f runs/run-2026-04-25T01-45/personas.json`
**Exit code**: 1
**Output**:
```
Command failed: test -f runs/run-2026-04-25T01-45/personas.json
```

## ❌ personas-count

**Command**: `python3 -c "import json,sys; d=json.load(open('runs/run-2026-04-25T01-45/personas.json')); sys.exit(0 if isinstance(d,list) and len(d)==10 else 1)"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 1, in <module>
FileNotFoundError: [Errno 2] No such file or directory: 'runs/run-2026-04-25T01-45/personas.json'
```

## ❌ graph-present

**Command**: `test -f runs/run-2026-04-25T01-45/graph.json`
**Exit code**: 1
**Output**:
```
Command failed: test -f runs/run-2026-04-25T01-45/graph.json
```

## ❌ graph-valid

**Command**: `python3 -c "import json,sys; d=json.load(open('runs/run-2026-04-25T01-45/graph.json')); sys.exit(0 if 'follows' in d and isinstance(d['follows'],dict) else 1)"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 1, in <module>
FileNotFoundError: [Errno 2] No such file or directory: 'runs/run-2026-04-25T01-45/graph.json'
```

## ❌ timeline-file-exists

**Command**: `touch runs/run-2026-04-25T01-45/timeline.jsonl && test -f runs/run-2026-04-25T01-45/timeline.jsonl`
**Exit code**: 1
**Output**:
```
touch: runs/run-2026-04-25T01-45/timeline.jsonl: No such file or directory
```

## ❌ vault-overview

**Command**: `test -f vault/runs/run-2026-04-25T01-45/overview.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f vault/runs/run-2026-04-25T01-45/overview.md
```

## ❌ vault-persona-notes

**Command**: `test "$(ls vault/runs/run-2026-04-25T01-45/personas/*.md 2>/dev/null | wc -l | tr -d ' ')" = "10"
`
**Exit code**: 1
**Output**:
```
Command failed: test "$(ls vault/runs/run-2026-04-25T01-45/personas/*.md 2>/dev/null | wc -l | tr -d ' ')" = "10"
```
