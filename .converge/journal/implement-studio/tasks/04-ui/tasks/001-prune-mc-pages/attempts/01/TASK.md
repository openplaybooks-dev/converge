# Task: 04-ui/001-prune-mc-pages

Delete UI pages that are tied to features we removed in Phase 01.

**Delete (if present in upstream)**:
- Agent registry pages (`(studio)/agents/**` or similar)
- Multi-tenant org/project switcher pages
- RBAC/user/permission settings pages
- Framework-adapter dashboards (OpenClaw, CrewAI, LangGraph, AutoGen)
- Sign-in/sign-up pages (NextAuth)

**Keep**:
- App shell (`layout.tsx`, sidebar, theme provider)
- Tasks list/detail components (we'll repurpose them)
- Runs/sessions list and timeline components
- Logs viewer
- Gantt component (if present)
- Tailwind/shadcn primitives

**Process**:
1. Walk `src/app/` and identify pages tied to removed features.
2. Delete those page files.
3. Update sidebar/nav to remove links pointing at deleted pages.
4. Run `pnpm --filter @converge/studio typecheck` and fix any dangling imports.

If a page imports from a removed `api/agents/**` route, either delete the page or stub the data fetch with a TODO referencing the converge-adapter equivalent.