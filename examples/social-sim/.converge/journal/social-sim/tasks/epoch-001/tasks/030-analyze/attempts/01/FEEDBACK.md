# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **metrics-row-appended**
- ❌ **report-mentions-tick**
- ❌ **vault-tick-note**
- ❌ **vault-overview-links-tick**

## ❌ metrics-row-appended

**Command**: `python3 -c "import json,sys; lines=[json.loads(l) for l in open('runs/run-2026-04-25T01-45/metrics.jsonl') if l.strip()]; hits=[l for l in lines if l.get('tick')==1]; sys.exit(0 if len(hits)==1 else 1)"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 1, in <module>
FileNotFoundError: [Errno 2] No such file or directory: 'runs/run-2026-04-25T01-45/metrics.jsonl'
```

## ❌ report-mentions-tick

**Command**: `grep -q 'Tick 1' vault/reports/misinfo.md`
**Exit code**: 2
**Output**:
```
grep: vault/reports/misinfo.md: No such file or directory
```

## ❌ vault-tick-note

**Command**: `test -f vault/runs/run-2026-04-25T01-45/ticks/tick-1.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f vault/runs/run-2026-04-25T01-45/ticks/tick-1.md
```

## ❌ vault-overview-links-tick

**Command**: `grep -q 'tick-1' vault/runs/run-2026-04-25T01-45/overview.md`
**Exit code**: 1
**Output**:
```
Command failed: grep -q 'tick-1' vault/runs/run-2026-04-25T01-45/overview.md
```
