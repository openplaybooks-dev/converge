---
id: 014-app-settings
title: App settings page (theme, language, data dir)
outputs:
  - packages/converge-studio/src/app/settings
  - packages/converge-studio/src/app/api/settings
checks:
  - id: settings-page-exists
    description: /settings page exists
    cmd: "test -f packages/converge-studio/src/app/settings/page.tsx"
  - id: settings-api-exists
    description: /api/settings returns the read-only environment info
    cmd: "test -f packages/converge-studio/src/app/api/settings/route.ts"
  - id: typecheck-passes
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
---

Three controls, nothing more. The studio is local and single-user; there is no multi-user settings surface to port from MC.

**Add `src/app/api/settings/route.ts`:**
- `GET` returns `{ dataDir, defaultDataDir, locale, themes: string[], version }` — read-only environment info.
- No `PUT` — theme and locale are persisted client-side.

**Add `src/app/settings/page.tsx`:**

Three sections, each ~30 LOC:

1. **Appearance** — theme picker. Use `next-themes`'s `useTheme()` hook. List the available themes (read from the existing `THEME_IDS` if it survives the prune; otherwise hard-code `['void', 'paper']` for now). Persists to `localStorage.theme` (which `next-themes` does automatically).
2. **Language** — language switcher. Buttons or a select listing the locales from `messages/`. On change, set the `NEXT_LOCALE` cookie (the i18n config in `src/i18n/request.ts` already reads this cookie) and call `router.refresh()`.
3. **Environment** — read-only display. Data dir path (from `/api/settings`), studio version (from `/api/settings`, sourced from `package.json`), node version. No edit affordances — these are operator-controlled via env vars, not via the UI.

**Wire it in:** the `Settings` link in the SiteHeader (from `010-shell-and-branding`) already points at `/settings`. This task fills it in.

**Verification:**
- Theme switcher actually changes the page theme without a reload.
- Language switcher changes the UI language on next page load (the i18n provider re-fetches messages).
- Environment section shows the real `MISSION_CONTROL_DATA_DIR` (or whatever env var the adapter actually reads — check `src/lib/converge-adapter/paths.ts`). Note: if you keep the env-var name `MISSION_CONTROL_DATA_DIR` for backward compatibility with vendored code, that's fine — it's an env var, not a string in the UI. Otherwise rename to `CONVERGE_STUDIO_DATA_DIR` in `paths.ts` and document the migration.
