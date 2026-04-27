# Task: 04-ui/020-converge-shell

Replace the inherited Mission Control layout with a minimal converge-native shell.

**`src/components/layout/converge-header.tsx`** — server component, renders:
- Logo / wordmark on the left ("converge studio" — small, no Mission Control branding).
- Nav links: `/playbooks`, `/runs`, `/settings` (only these three, in this order).
- Theme toggle on the right (reuse the existing `next-themes` toggle if present; otherwise inline a small `<button>` that calls `useTheme().setTheme`).
- That's all. No fleet stats, no live activity feed, no banners, no gateway status, no "Launch Sequence" CTA.

**`src/app/layout.tsx`** — must:
- Render `<NextIntlClientProvider>` (server-side `getLocale()`, message catalog from `messages/`).
- Render `<ThemeProvider>` from `next-themes`.
- Render `<ConvergeHeader />` once, at the top.
- Render `{children}` in a `<main>` element.
- Set `<html lang={locale}>` and a sensible `<title>`.
- Import zero MC components. Specifically: no `nav-rail`, `site-header`, `live-feed`, `local-mode-banner`, anything with `launch`, `onboarding`, `fleet`, `gateway`, or `openclaw` in the name.

**`messages/*.json`** — replace any string containing "Mission Control" with "Converge Studio". Replace "Launch Sequence", "Dock an Agent", "Dispatch a Task" entries by deleting the keys; the new shell doesn't reference them.

**Process:**
1. Write the new `converge-header.tsx`.
2. Rewrite `layout.tsx`.
3. Update `messages/en.json` and any other locale files: replace MC strings, delete obsolete keys.
4. Run typecheck. Fix any dangling imports the new layout introduces.