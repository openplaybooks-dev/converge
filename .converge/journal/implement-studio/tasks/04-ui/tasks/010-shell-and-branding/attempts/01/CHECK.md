# Checks: 04-ui/010-shell-and-branding

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## layout-exists
**Description**: layout.tsx exists
**Command**: `test -f packages/converge-studio/src/app/layout.tsx`

## no-mc-banners
**Description**: layout.tsx does not import any of the deleted MC banners/wizards/modals
**Command**: `! grep -E 'OnboardingWizard|ProjectManagerModal|ExecApprovalOverlay|LocalModeBanner|UpdateBanner|OpenClawUpdateBanner|OpenClawDoctorBanner|NavRail|HeaderBar|LiveFeed' packages/converge-studio/src/app/layout.tsx`

## converge-metadata
**Description**: layout.tsx metadata title references converge, not Mission Control
**Command**: `grep -q 'converge' packages/converge-studio/src/app/layout.tsx && ! grep -i 'mission control' packages/converge-studio/src/app/layout.tsx`

## typecheck-passes
**Description**: Studio still typechecks
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`