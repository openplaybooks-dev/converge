# RESULT.md — Attempt 1

**Outcome**: ✅ SUCCESS
**Duration**: 377ms
**Completed**: 2026-04-21T10:49:01.953Z

## Outputs

- `screenplay.fountain` — ✓ produced (8.8 KB)

## Check Results — ❌ some failed

- ✓ **screenplay-exists**: Screenplay file written and non-empty
- ✗ **screenplay-has-scene-headings**: Screenplay has at least 5 scene headings
- ✓ **screenplay-has-dialogue**: Screenplay has at least 3 character cues (dialogue)

## Failed Check Details

### screenplay-has-scene-headings — ❌ FAILED
**Command**: `grep -cE '^(INT|EXT|INT/EXT|I/E)\. ' screenplay.fountain  | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=5?0:1)"`
**Exit code**: 255
**Output**:
```
'EXT' is not recognized as an internal or external command,
operable program or batch file.
```
