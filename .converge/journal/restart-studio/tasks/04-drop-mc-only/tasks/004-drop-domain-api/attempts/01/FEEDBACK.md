# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **only-allowlist-remains**
- ❌ **marker-written**

## ❌ only-allowlist-remains

**Command**: `bash -c 'cd packages/studio/src/app/api && allowed="playbooks runs run watch events search settings"; for d in */; do d=${d%/}; case " $allowed " in *" $d "*) ;; *) echo "unexpected: $d"; exit 1 ;; esac; done'`
**Exit code**: 1
**Output**:
```
unexpected: activities
```

## ❌ marker-written

**Command**: `test -f .converge/studio-state/dropped-domain-api.txt`
**Exit code**: 1
**Output**:
```
Command failed: test -f .converge/studio-state/dropped-domain-api.txt
```
