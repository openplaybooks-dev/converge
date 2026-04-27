# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **api-allowlist-only**
- ✅ **api-required-present**
- ❌ **nodejs-runtime-on-all-routes**

## ❌ api-allowlist-only

**Command**: `bash -c 'cd packages/converge-studio/src/app/api && allowed="playbooks runs run watch events"; for d in */; do d=${d%/}; case " $allowed " in *" $d "*) ;; *) echo "unexpected: $d"; exit 1 ;; esac; done'`
**Exit code**: 1
**Output**:
```
unexpected: search
```

## ❌ nodejs-runtime-on-all-routes

**Command**: `bash -c 'count=$(find packages/converge-studio/src/app/api -name route.ts | wc -l | tr -d " "); ok=$(grep -l "runtime = .nodejs." $(find packages/converge-studio/src/app/api -name route.ts) 2>/dev/null | wc -l | tr -d " "); test "$count" = "$ok"'`
**Exit code**: 1
**Output**:
```
Command failed: bash -c 'count=$(find packages/converge-studio/src/app/api -name route.ts | wc -l | tr -d " "); ok=$(grep -l "runtime = .nodejs." $(find packages/converge-studio/src/app/api -name route.ts) 2>/dev/null | wc -l | tr -d " "); test "$count" = "$ok"'
```
