# Task: 03-rebind-ui/001-rebind-shell-nav

Rebind `src/components/layout/nav-rail.tsx` and `src/components/layout/header-bar.tsx`.

**nav-rail.tsx:**
- Replace nav items list with: `[{ href: '/playbooks', label: 'Playbooks' }, { href: '/runs', label: 'Runs' }, { href: '/settings', label: 'Settings' }]`
- Remove multi-tenant org switcher; show converge project name (`path.basename(findConvergeRoot())` or env var)
- Replace MC's live-status hook with `useConvergeEvents()` for the pulsing-dot status
- Remove role-based filtering (converge has no auth)
- **Keep:** collapsible sidebar, mobile bottom-sheet, all Tailwind classes, keyboard shortcuts (adapt key bindings to converge routes)

**header-bar.tsx:**
- Wire search input to `/api/search`
- Notifications bell → link to `/runs` (no notifications domain in MVP)
- Connection status: green dot + "Local" when `useConvergeEvents().connected`, red when not
- **Keep:** layout, latency display, digital clock, theme toggle, language switcher
- Remove imports for: gateway-config, openclaw-doctor, fleet-status, agent-runtimes