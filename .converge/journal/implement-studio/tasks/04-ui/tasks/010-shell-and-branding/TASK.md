---
id: 010-shell-and-branding
title: Slim app shell, converge branding, minimal nav
outputs:
  - packages/converge-studio/src/app/layout.tsx
  - packages/converge-studio/src/components/layout/site-header.tsx
checks:
  - id: layout-exists
    description: layout.tsx exists
    cmd: "test -f packages/converge-studio/src/app/layout.tsx"
  - id: no-mc-banners
    description: layout.tsx does not import any of the deleted MC banners/wizards/modals
    cmd: "! grep -E 'OnboardingWizard|ProjectManagerModal|ExecApprovalOverlay|LocalModeBanner|UpdateBanner|OpenClawUpdateBanner|OpenClawDoctorBanner|NavRail|HeaderBar|LiveFeed' packages/converge-studio/src/app/layout.tsx"
  - id: converge-metadata
    description: layout.tsx metadata title references converge, not Mission Control
    cmd: "grep -q 'converge' packages/converge-studio/src/app/layout.tsx && ! grep -i 'mission control' packages/converge-studio/src/app/layout.tsx"
  - id: typecheck-passes
    description: Studio still typechecks
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
---

The legacy `layout.tsx` mounts a Mission Control onboarding wizard, three banner stacks (LocalMode / Update / OpenClaw), a project-manager modal, and an exec-approval overlay. None of that belongs in a converge-only studio. Replace with a minimal shell.

**Rewrite `src/app/layout.tsx`** to:
- Keep: `next-intl` provider + `getLocale` / `getMessages` server boot, `next-themes` ThemeProvider, the font setup, `<html lang>` + `<body>` skeleton, the no-FOUC inline theme script.
- Drop: `OnboardingWizard`, `ProjectManagerModal`, `ExecApprovalOverlay`, `LocalModeBanner`, `UpdateBanner`, `OpenClawUpdateBanner`, `OpenClawDoctorBanner`, `NavRail`, `HeaderBar`, `LiveFeed`, `useWebSocket`, `useServerEvents`, `useMissionControl` (the legacy Zustand store), `OrchestrationBar`, `Loader` boot screen.
- Mount: a new `<SiteHeader />` (described below) above `{children}`, nothing else.
- Metadata: `title: 'converge — playbooks'`, `description: 'Web UI for managing converge playbooks, tasks, and runs.'`, no `appleWebApp.title: 'Mission Control'`, no Mission Control OG tags.
- Icons: investigate whether converge brand assets exist (look in `packages/cli/`, `packages/core/`, repo root). If yes, reference them; if no, drop the icon set down to a single favicon and a TODO.

**Add `src/components/layout/site-header.tsx`** (≤ 60 LOC):
- A flex row with the converge wordmark (text only is fine if no asset exists) on the left.
- Three nav links on the right: `Playbooks` → `/`, `Runs` → `/runs`, `Settings` → `/settings` (route may not exist yet — that's acceptable; it 404s harmlessly).
- A small `<LiveActivity />` indicator (from task 009) on the far right, showing connection state with a colored dot. Optional; keep it minimal.
- Use `usePathname()` to mark the current section.

**Verification:**
- `grep -ri 'mission control' packages/converge-studio/src packages/converge-studio/messages` returns nothing.
- `pnpm --filter @converge/studio dev` boots; `curl -s http://localhost:4000/` returns 200; the body contains `converge` and the literal `Playbooks` from the nav.
- DevTools console on `/` shows no errors about missing components, missing translations, or missing icons.
