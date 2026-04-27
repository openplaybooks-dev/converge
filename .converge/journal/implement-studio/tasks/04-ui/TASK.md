---
title: Phase 04 — UI pages and components
blocking: true
---

Strip Mission Control's UI down to its useful primitives and rebuild a converge-native shell on top. Playbook is the root entity (Stripe-style: `/` lands on the playbooks index, not on a Mission Control dashboard). Drop the legacy `[[...panel]]` catch-all and every panel that depended on the gateway / fleet / sessions-as-agents framing. Replace the gateway-websocket boot with a converge-native event source over the filesystem watcher.

Keep: theme provider, i18n provider, the existing `(studio)/playbooks/**` and `(studio)/runs/**` pages, the `converge-adapter` lib, and the Tailwind/shadcn primitives under `src/components/ui/`.

Eighteen leaf tasks. Tasks 001–010 produce the core shell and workflow; tasks 011–018 port the remaining Mission Control features that have natural converge analogs.

**Core shell + workflow:**

1. **001-prune-mc-pages** — delete obsolete upstream pages, panels, dashboards, and the `[[...panel]]` catch-all. Delete the gateway/openclaw/onboarding/projects API routes and the websocket/plugins/device-identity lib files. Verify no `Mission Control` literal remains in `src/`.
2. **002-playbooks-list-detail** — `/playbooks` list and `/playbooks/[name]` detail with table/kanban/tree view modes for the tasks panel.
3. **003-new-playbook-form** — `/playbooks/new` form posting to `POST /api/playbooks`.
4. **004-task-editor** — `/playbooks/[name]/tasks/[...path]` frontmatter form + Monaco markdown body + Reset/Save.
5. **005-runs-list** — `/runs` with table and kanban view modes across all sessions.
6. **006-live-session-view** — `/runs/[playbook]/[sessionId]` with gantt, journal, and tree view modes.
7. **007-view-modes** — shared `ViewSwitcher` component plus `KanbanBoard`, `TaskTree`, `SessionGantt` primitives consumed by tasks 002, 005, 006.
8. **008-promote-playbooks-to-root** — promote `(studio)/playbooks` to the URL root: `/` becomes the playbooks index, `(studio)` route group is deleted.
9. **009-converge-event-stream** — replace gateway/websocket boot with an SSE endpoint backed by `converge-adapter/watcher.ts`; minimal `LiveActivity` component consuming it.
10. **010-shell-and-branding** — slim `layout.tsx` (i18n + theme only), drop MC banners/wizards/modals, replace metadata strings, add a minimal converge header/nav.

**Ported MC features (converge-flavored):**

11. **011-logs-panel** — read-only session-events log viewer with level/timestamp filters, separate from the live gantt view.
12. **012-cron-scheduler** — schedule a playbook to run on a cron expression; persists to `playbook.yml`'s schedule field; CLI/runner picks it up.
13. **013-audit-log** — historical run table with timestamp/playbook/status/duration; reads from `.converge/journal/`.
14. **014-app-settings** — `/settings` page with theme picker, language switcher, and a read-only data-dir display.
15. **015-empty-state-onboarding** — when playbook count is 0, render a "Get Started" card on `/` with a Create Playbook CTA. Replaces the MC Launch Sequence wizard.
16. **016-command-palette** — Cmd-K palette to search across playbooks, tasks, and runs.
17. **017-export** — export-as-JSON for run sessions; export-as-YAML for playbooks. Buttons on the relevant detail pages.
18. **018-secrets-scan** — scan playbook task scripts for hardcoded secrets (AWS keys, API tokens, password assignments). Surface findings on the playbook detail page.

**Hard MC port — convergence to converge-native shell only:**

The earlier `001-prune-mc-pages` and `010-shell-and-branding` ran with too narrow a scope and a huge amount of Mission Control's surface (the `[[...panel]]` catch-all, dozens of panels under `src/components/panels/`, a `src/components/dashboard/` tree, ~50 MC-only API routes, the `nav-rail`, banners, and onboarding wizard) is still on disk. When the dev server boots, `/` lands on the catch-all and renders Mission Control's launch dashboard. Tasks 019–024 finish the port.

19. **019-purge-mc-surface** — explicit hard-delete: the `[[...panel]]` route, every `src/components/{dashboard,onboarding,panels,modals,hud,terminal,chat}/`, every `src/components/layout/{nav-rail,header-bar,live-feed,*-banner,site-header}.tsx`, every API route under `src/app/api/` that is not converge-native (keep only: `playbooks`, `runs`, `run`, `watch`, `events`), and every `src/lib/{gateway-*,openclaw-*,onboarding-*,pty-*,websocket-*}.ts`.
20. **020-converge-shell** — minimal converge-native shell: `src/app/layout.tsx` renders only theme + i18n providers + a slim header (logo, `/playbooks` link, `/runs` link, `/settings` link, theme toggle). No "Mission Control" string, no fleet stats, no launch-sequence cards.
21. **021-root-redirects-to-playbooks** — `src/app/page.tsx` redirects to `/playbooks` (server redirect). Removes any remaining MC dashboard render path.
22. **022-no-mc-data-models** — codify the negative gate: no file in `src/` references `fleet`, `agent-runtime`, `gateway`, `openclaw`, `Mission Control`, `launch sequence`, `dispatch task`, or `dock an agent`. Strings in `messages/*.json` count too.
23. **023-runtime-smoke** — boot `pnpm dev`, request `/`, assert it redirects to `/playbooks` and returns 200 with the playbooks index HTML (must contain a known playbook name like `implement-studio`).
24. **024-no-mc-api-routes** — explicit gate: `src/app/api/` contains exactly these top-level dirs and no others: `playbooks`, `runs`, `run`, `watch`, `events`. (Plus health-check / static if upstream had any — list them in this task's frontmatter explicitly.)
