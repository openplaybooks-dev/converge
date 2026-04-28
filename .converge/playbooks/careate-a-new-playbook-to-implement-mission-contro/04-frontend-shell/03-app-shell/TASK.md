---
title: App shell and navigation
outputs:
  - packages/mission-control-frontend/src/AppShell.tsx
  - packages/mission-control-frontend/src/Nav.tsx
  - packages/mission-control-frontend/src/App.tsx
checks:
  - id: shell-exists
    cmd: test -s packages/mission-control-frontend/src/AppShell.tsx
    description: AppShell.tsx exists and is non-empty
  - id: nav-exists
    cmd: test -s packages/mission-control-frontend/src/Nav.tsx
    description: Nav.tsx exists and is non-empty
  - id: app-exists
    cmd: test -s packages/mission-control-frontend/src/App.tsx
    description: App.tsx exists and is non-empty
  - id: shell-imports-nav
    cmd: "grep -qE \"from +['\\\"]\\\\./Nav['\\\"]\" packages/mission-control-frontend/src/AppShell.tsx"
    description: AppShell imports Nav from ./Nav
  - id: app-renders-shell
    cmd: grep -qE "AppShell" packages/mission-control-frontend/src/App.tsx
    description: App.tsx references AppShell
  - id: nav-uses-manifest
    cmd: "grep -qE \"cli-commands\\\\.json|commandsManifest\" packages/mission-control-frontend/src/Nav.tsx"
    description: Nav derives entries from cli-commands.json (no hand-enumeration)
  - id: shell-hosts-children
    cmd: "grep -qE \"children\" packages/mission-control-frontend/src/AppShell.tsx"
    description: AppShell accepts a children prop so the router can plug in the active route
---

# App shell and navigation

**Goal**: Replace the placeholder `App.tsx` with the real chrome — a layout that hosts the router outlet plus a navigation sidebar grouping every CLI command by domain.

## Scope

Read `cli-commands.json`. Group the commands into navigation sections by stable rule (e.g. prefix before `:` or `-`, falling back to a "Misc" group). Build `src/AppShell.tsx` with a header (app title, version badge), a left-rail nav listing groups → commands as router links, and a `<main>` that renders the active route. Replace `src/App.tsx` to render `<AppShell />`. The grouping rule must be deterministic and re-runnable so adding a new command in `cli-commands.json` updates the nav without code edits — derive groups at build time from the manifest.

### Inputs
- `cli-commands.json`
- `packages/mission-control-frontend/src/ui/index.ts`
- `packages/mission-control-frontend/src/App.tsx` (placeholder from `00-scaffold`)

### Outputs
- `packages/mission-control-frontend/src/AppShell.tsx`
- `packages/mission-control-frontend/src/Nav.tsx`
- `packages/mission-control-frontend/src/App.tsx` (rewritten)

### Constraints
- Do NOT enumerate commands by hand; everything must derive from `cli-commands.json`.
- The grouping rule must be deterministic (same manifest → same nav).
- Use shared UI primitives from `../ui` for styling — do not reinvent buttons/cards here.
- Do NOT implement per-command views or do API work — that belongs to `04-router-registry` and `05-command-views`.
- The build is allowed to fail on the missing `./router` import — `04-router-registry` will create that file. The order is intentional.

## Instructions

1. **Confirm framework + path.** Read `ARCHITECTURE.md` (the `## Frontend` and `## Project Layout` sections) to confirm the framework (React/Solid/Vue) and the package path. The body below assumes React + the default path `packages/mission-control-frontend/`. If `ARCHITECTURE.md` chose a different framework, translate component / hook idioms to that framework but keep the file names and shapes identical.

2. **Load the command manifest.** Use the **Read** tool to read `cli-commands.json` from the project root. Confirm its shape (expect `{ commands: [{ name, description, ... }] }`). If the manifest is missing or empty, stop and surface the gap before writing any files.

3. **Decide the grouping rule.** Group rule, applied to each `command.name`:
   - Split on the first occurrence of `:`, `-`, or `.` (whichever appears first).
   - If a delimiter is present, the prefix is the group name (e.g. `plan:run` → `plan`, `journal-list` → `journal`).
   - If no delimiter, the group is `general`.
   - Lower-case group names. Sort groups alphabetically; within a group, sort commands alphabetically by `name`.
   - Implement the rule as a pure function in `Nav.tsx` (or a small helper alongside it) so it is re-runnable from the manifest at build time.

4. **Write `packages/mission-control-frontend/src/Nav.tsx`** using the **Write** tool. Requirements:
   - `import manifest from '../../cli-commands.json'` (Vite supports JSON imports natively; adjust the relative path if the manifest lives elsewhere — verify the path resolves from `src/Nav.tsx`).
   - Type the import minimally (`{ commands: { name: string; description?: string }[] }`).
   - Compute the grouping inline (or via a helper function `groupCommands(commands)` exported from the same file) per step 3.
   - Render one `<section>` per group with the group name as a heading and an `<a href="/commands/<name>">` (or framework router link — `<Link to=...>` for React Router) per command. The link's visible text is the command's `name`; tooltip / `title` attribute carries `description` if present.
   - Highlight the active route (`window.location.pathname` comparison is acceptable as a fallback if no router hook is wired yet — `04-router-registry` will swap in the framework's `useLocation`/`useRouter` once it lands).
   - Pull `Card` / styling primitives from `../ui` (`import { Card } from './ui'`) for visual structure. No raw inline styles for layout — use the primitives or a className from the chosen styling system.

5. **Write `packages/mission-control-frontend/src/AppShell.tsx`** using the **Write** tool. Requirements:
   - Accept a single `children` prop (the active route element, plugged in by `04-router-registry` via `App.tsx`).
   - Layout: a top `<header>` with the app title "Mission Control" and a version badge (read `version` from `package.json` via Vite's `import.meta.env` or a JSON import — fall back to a hard-coded `"dev"` string if neither is wired up yet); a flex row beneath with `<aside>` hosting `<Nav />` (imported from `./Nav`) and `<main>` rendering `{children}`.
   - Use UI primitives from `./ui` where they fit. Keep the file under ~80 lines.
   - Do NOT do any data fetching or API calls here.

6. **Rewrite `packages/mission-control-frontend/src/App.tsx`** using the **Write** tool. Requirements:
   - `import { AppShell } from './AppShell'`
   - `import { routerOutlet } from './router'` — this import will fail to resolve until `04-router-registry` runs. That is intentional and gates the order. Do not stub the import to make it pass; the failure is the contract.
   - Render `<AppShell>{routerOutlet}</AppShell>` and export it as the default.
   - Delete any leftover placeholder markup from the `00-scaffold` version (e.g. the "Mission Control" heading) — `AppShell` now owns the chrome.

7. **Run the checks** declared in the frontmatter from the project root:
   - `test -s packages/mission-control-frontend/src/AppShell.tsx`
   - `test -s packages/mission-control-frontend/src/Nav.tsx`
   - `test -s packages/mission-control-frontend/src/App.tsx`
   - `grep -qE "from +['\"]\./Nav['\"]" packages/mission-control-frontend/src/AppShell.tsx`
   - `grep -qE "AppShell" packages/mission-control-frontend/src/App.tsx`
   - `grep -qE "cli-commands\.json|commandsManifest" packages/mission-control-frontend/src/Nav.tsx`
   - `grep -qE "children" packages/mission-control-frontend/src/AppShell.tsx`
   All must exit 0.

8. **Do NOT run `npm install` or the dev server.** TypeScript / build errors from the missing `./router` import are expected and will be resolved by `04-router-registry`. This child's success is purely the file-shape contract above.

## Notes / open gaps from the parent PLAN

- **Framework choice cascades.** This task assumes React. If `ARCHITECTURE.md` chose Solid or Vue, the JSX and the router-link primitive change, but the file names and the grouping logic stay identical.
- **Manifest field shape.** This task assumes `cli-commands.json` has shape `{ commands: [{ name, description }] }`. If `00-cli-inventory` produced a different shape, the grouping rule's input keys may need adjustment.
- **Stub view path convention.** `04-router-registry` is the source of truth for `/commands/:safeName` URLs. This task uses the raw `name` in nav links; if `04-router-registry` sanitizes names (e.g. `plan:run` → `plan-run`), the nav must apply the same sanitizer. Recommend extracting `safeName(name)` into a tiny shared helper that both `Nav.tsx` and `04-router-registry`'s generator import — but only if `04-router-registry` agrees, otherwise inline the same rule in both files.
