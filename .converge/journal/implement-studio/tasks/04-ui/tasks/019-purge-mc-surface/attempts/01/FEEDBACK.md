# FEEDBACK.md — Check Results

**Status**: ❌ 5/6 check(s) failed

- ❌ **catchall-deleted**
- ❌ **dashboard-tree-deleted**
- ❌ **layout-banners-deleted**
- ❌ **mc-libs-deleted**
- ❌ **api-purged**
- ✅ **typecheck-passes**

## ❌ catchall-deleted

**Command**: `test ! -d 'packages/converge-studio/src/app/[[...panel]]'`
**Exit code**: 1
**Output**:
```
Command failed: test ! -d 'packages/converge-studio/src/app/[[...panel]]'
```

## ❌ dashboard-tree-deleted

**Command**: `test ! -d 'packages/converge-studio/src/components/dashboard' && test ! -d 'packages/converge-studio/src/components/panels' && test ! -d 'packages/converge-studio/src/components/modals' && test ! -d 'packages/converge-studio/src/components/hud' && test ! -d 'packages/converge-studio/src/components/terminal' && test ! -d 'packages/converge-studio/src/components/chat' && test ! -d 'packages/converge-studio/src/components/onboarding'`
**Exit code**: 1
**Output**:
```
Command failed: test ! -d 'packages/converge-studio/src/components/dashboard' && test ! -d 'packages/converge-studio/src/components/panels' && test ! -d 'packages/converge-studio/src/components/modals' && test ! -d 'packages/converge-studio/src/components/hud' && test ! -d 'packages/converge-studio/src/components/terminal' && test ! -d 'packages/converge-studio/src/components/chat' && test ! -d 'packages/converge-studio/src/components/onboarding'
```

## ❌ layout-banners-deleted

**Command**: `bash -c 'cd packages/converge-studio/src/components/layout && for f in nav-rail.tsx header-bar.tsx live-feed.tsx site-header.tsx local-mode-banner.tsx update-banner.tsx promo-banner.tsx openclaw-doctor-banner.tsx openclaw-update-banner.tsx; do test ! -f "$f" || { echo "$f still present"; exit 1; }; done'`
**Exit code**: 1
**Output**:
```
nav-rail.tsx still present
```

## ❌ mc-libs-deleted

**Command**: `bash -c 'cd packages/converge-studio/src/lib && for pat in gateway- openclaw- onboarding- pty- websocket-; do for f in ${pat}*.ts; do [ "$f" = "${pat}*.ts" ] || { echo "$f still present"; exit 1; }; done; done'`
**Exit code**: 1
**Output**:
```
gateway-runtime.ts still present
```

## ❌ api-purged

**Command**: `bash -c 'cd packages/converge-studio/src/app/api && allowed="playbooks runs run watch events"; for d in */; do d=${d%/}; case " $allowed " in *" $d "*) ;; *) echo "$d still present"; exit 1 ;; esac; done'`
**Exit code**: 1
**Output**:
```
activities still present
```
