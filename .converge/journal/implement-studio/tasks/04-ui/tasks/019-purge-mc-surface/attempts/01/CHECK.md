# Checks: 04-ui/019-purge-mc-surface

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## catchall-deleted
**Description**: The [[...panel]] catch-all is gone
**Command**: `test ! -d 'packages/converge-studio/src/app/[[...panel]]'`

## dashboard-tree-deleted
**Description**: src/components/dashboard, panels, modals, hud, terminal, chat, onboarding all deleted
**Command**: `test ! -d 'packages/converge-studio/src/components/dashboard' && test ! -d 'packages/converge-studio/src/components/panels' && test ! -d 'packages/converge-studio/src/components/modals' && test ! -d 'packages/converge-studio/src/components/hud' && test ! -d 'packages/converge-studio/src/components/terminal' && test ! -d 'packages/converge-studio/src/components/chat' && test ! -d 'packages/converge-studio/src/components/onboarding'`

## layout-banners-deleted
**Description**: nav-rail, header-bar, live-feed, banner files in src/components/layout/ are deleted
**Command**: `bash -c 'cd packages/converge-studio/src/components/layout && for f in nav-rail.tsx header-bar.tsx live-feed.tsx site-header.tsx local-mode-banner.tsx update-banner.tsx promo-banner.tsx openclaw-doctor-banner.tsx openclaw-update-banner.tsx; do test ! -f "$f" || { echo "$f still present"; exit 1; }; done'`

## mc-libs-deleted
**Description**: gateway-*, openclaw-*, onboarding-*, pty-*, websocket-* lib modules are deleted
**Command**: `bash -c 'cd packages/converge-studio/src/lib && for pat in gateway- openclaw- onboarding- pty- websocket-; do for f in ${pat}*.ts; do [ "$f" = "${pat}*.ts" ] || { echo "$f still present"; exit 1; }; done; done'`

## api-purged
**Description**: src/app/api/ contains only converge-native routes
**Command**: `bash -c 'cd packages/converge-studio/src/app/api && allowed="playbooks runs run watch events"; for d in */; do d=${d%/}; case " $allowed " in *" $d "*) ;; *) echo "$d still present"; exit 1 ;; esac; done'`

## typecheck-passes
**Description**: Studio still typechecks after the purge
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`