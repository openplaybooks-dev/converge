# Task: 04-ui/001-prune-mc-pages

Delete every UI surface that belonged to upstream Mission Control's agent-fleet / gateway / multi-tenant model. The studio is converge-only; nothing about agents, fleets, or gateways belongs here.

**Delete (route-level):**
- `src/app/[[...panel]]/` — the entire legacy dashboard catch-all (Launch Sequence, Fleet Status, Activity feed, ~30 panels). It is the home page that new users see; killing it is the whole point of the prune.
- Agent registry pages (`(studio)/agents/**` or similar)
- Multi-tenant org/project switcher pages (`orgs/**`, `users/**`, `rbac/**`)
- Framework-adapter dashboards (OpenClaw, CrewAI, LangGraph, AutoGen) — anything under `(studio)/openclaw`, `(studio)/frameworks`, etc.
- Sign-in/sign-up pages (NextAuth) if present and not needed for converge auth.

**Delete (component-level):**
- `src/components/dashboard/` — fleet widget, launch sequence, session-workbench, etc.
- `src/components/panels/` — every panel that the `[[...panel]]` router switched on.
- `src/components/onboarding/` — onboarding wizard.
- `src/components/modals/` — project-manager modal, exec-approval overlay, etc.
- Inside `src/components/layout/`: delete `nav-rail.tsx`, `header-bar.tsx`, `live-feed.tsx`, `local-mode-banner.tsx`, `update-banner.tsx`, `openclaw-update-banner.tsx`, `openclaw-doctor-banner.tsx`. (A new minimal header arrives in task 010.)

**Delete (lib-level):**
- `src/lib/websocket.ts`, `src/lib/device-identity.ts`, `src/lib/plugins.ts`, `src/lib/navigation-metrics.ts`, `src/lib/use-server-events.ts`, `src/lib/browser-security.ts` (only if nothing converge-native still imports it).
- Gateway-related store slices in `src/store/` (keep playbook/task slices).

**Delete (api-level):**
- `src/app/api/gateways/`
- `src/app/api/openclaw/`
- `src/app/api/onboarding/`
- `src/app/api/projects/`
- `src/app/api/events/` — the legacy events endpoint. Task 009 reintroduces a converge-native one.

**Keep:**
- App shell skeleton in `src/app/layout.tsx` (task 010 slims it).
- `src/app/(studio)/playbooks/**` and `src/app/(studio)/runs/**` — task 008 promotes them to root.
- `src/app/api/playbooks/**`, `src/app/api/runs/**`, `src/app/api/watch` (if present and converge-native).
- `src/components/ui/` — Tailwind/shadcn primitives.
- `src/lib/converge-adapter/**`.
- `src/i18n/` and `messages/`.

**Process:**
1. Walk `src/app/`, `src/components/`, `src/lib/` and delete the items above.
2. Run `pnpm --filter @converge/studio typecheck`. Resolve dangling imports by deleting the importer if it was Mission Control glue, or by inlining the import if it was a primitive that survives.
3. Final sweep: `grep -ril 'mission control' packages/converge-studio/src packages/converge-studio/messages` must return nothing. If it matches a string literal in a comment or test, edit the literal; if it matches a translation key in `messages/*.json`, replace the value.
4. Re-run typecheck. Move on.