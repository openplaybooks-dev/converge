---
title: Shared UI primitives
outputs:
  - packages/mission-control-frontend/src/ui/index.ts
  - packages/mission-control-frontend/src/ui/
checks:
  - id: barrel-exists
    cmd: "test -s packages/mission-control-frontend/src/ui/index.ts"
    description: Barrel file exists and is non-empty
  - id: primitive-count
    cmd: "find packages/mission-control-frontend/src/ui -maxdepth 1 -name '*.tsx' | wc -l | node -e \"process.exit(+require('fs').readFileSync(0,'utf8').trim()>=6?0:1)\""
    description: At least 6 primitive .tsx files exist directly under src/ui/
  - id: output-panel
    cmd: "grep -qE 'OutputPanel' packages/mission-control-frontend/src/ui/index.ts"
    description: OutputPanel is re-exported from the barrel
  - id: button-exists
    cmd: "test -s packages/mission-control-frontend/src/ui/Button.tsx"
    description: Button primitive file exists
  - id: textinput-exists
    cmd: "test -s packages/mission-control-frontend/src/ui/TextInput.tsx"
    description: TextInput primitive file exists
  - id: checkbox-exists
    cmd: "test -s packages/mission-control-frontend/src/ui/Checkbox.tsx"
    description: Checkbox primitive file exists
  - id: select-exists
    cmd: "test -s packages/mission-control-frontend/src/ui/Select.tsx"
    description: Select primitive file exists
  - id: formfield-exists
    cmd: "test -s packages/mission-control-frontend/src/ui/FormField.tsx"
    description: FormField primitive file exists
  - id: outputpanel-file-exists
    cmd: "test -s packages/mission-control-frontend/src/ui/OutputPanel.tsx"
    description: OutputPanel primitive file exists
  - id: card-exists
    cmd: "test -s packages/mission-control-frontend/src/ui/Card.tsx"
    description: Card primitive file exists
  - id: spinner-exists
    cmd: "test -s packages/mission-control-frontend/src/ui/Spinner.tsx"
    description: Spinner primitive file exists
  - id: barrel-reexports-all
    cmd: "grep -qE 'Button' packages/mission-control-frontend/src/ui/index.ts && grep -qE 'TextInput' packages/mission-control-frontend/src/ui/index.ts && grep -qE 'Checkbox' packages/mission-control-frontend/src/ui/index.ts && grep -qE 'Select' packages/mission-control-frontend/src/ui/index.ts && grep -qE 'FormField' packages/mission-control-frontend/src/ui/index.ts && grep -qE 'Card' packages/mission-control-frontend/src/ui/index.ts && grep -qE 'Spinner' packages/mission-control-frontend/src/ui/index.ts"
    description: Barrel re-exports every primitive by name
  - id: outputpanel-distinguishes-streams
    cmd: "grep -qE 'stderr|stream' packages/mission-control-frontend/src/ui/OutputPanel.tsx"
    description: OutputPanel references stderr/stream tagging for color distinction
  - id: outputpanel-autoscroll
    cmd: "grep -qE 'scroll|scrollTop|scrollIntoView' packages/mission-control-frontend/src/ui/OutputPanel.tsx"
    description: OutputPanel implements scroll behavior for streaming
  - id: no-router-coupling
    cmd: "! grep -rE \"from +['\\\"](\\.\\./)+router|react-router|@tanstack/router\" packages/mission-control-frontend/src/ui/ 2>/dev/null"
    description: Primitives do not import the router
  - id: no-api-coupling
    cmd: "! grep -rE \"from +['\\\"](\\.\\./)+api|fetch\\(|EventSource|WebSocket\" packages/mission-control-frontend/src/ui/ 2>/dev/null"
    description: Primitives do not call the API or open transports
  - id: no-manifest-coupling
    cmd: "! grep -rE 'cli-commands\\.json' packages/mission-control-frontend/src/ui/ 2>/dev/null"
    description: Primitives are not coupled to cli-commands.json
---

# Shared UI primitives

**Goal**: Provide the reusable UI building blocks every per-command view will compose, so `05-command-views` does not reinvent them N times.

## Scope

Build a small set of presentational primitives in `src/ui/`: `Button`, `TextInput`, `Checkbox`, `Select`, `FormField` (label + control + description + error), `OutputPanel` (renders a streaming log with stdout/stderr coloring and auto-scroll), `Card`, `Spinner`. Export them via `src/ui/index.ts`. Style with whatever `ARCHITECTURE.md` chose (CSS modules / Tailwind / vanilla). Keep them dumb — no API calls, no router knowledge, just props in / DOM out.

### Inputs

- `ARCHITECTURE.md` — the architecture decisions doc produced upstream of this container. Read the `## Frontend` section for styling approach and any UI library choice (Radix, shadcn, etc.).
- `packages/mission-control-frontend/package.json` — the scaffolded package from `00-scaffold`. Confirms the framework and dependency graph.

### Outputs

- `packages/mission-control-frontend/src/ui/index.ts` — barrel re-exporting every primitive by name.
- `packages/mission-control-frontend/src/ui/` — directory containing one `*.tsx` file per primitive (at least 6: `Button`, `TextInput`, `Checkbox`, `Select`, `FormField`, `OutputPanel`, `Card`, `Spinner`).

### Constraints

- Primitives are **presentational only**. No API calls, no `fetch`, no `EventSource`/`WebSocket`, no router imports, no `cli-commands.json` imports.
- `OutputPanel` MUST color-distinguish stdout vs stderr.
- `OutputPanel` MUST pin scroll to the bottom while new chunks arrive, releasing the pin if the user scrolls up.
- Each primitive is one file directly under `src/ui/` (no nested subfolders).

## Instructions

1. Read `ARCHITECTURE.md` (relative to the working directory in which the container is being executed). Locate the `## Frontend` section and extract:
   - **Framework** (e.g. React / Solid / Vue) — drives JSX dialect and event handler signatures.
   - **Styling approach** (CSS modules / Tailwind / vanilla CSS / styled-components).
   - **UI kit** (if any: Radix, shadcn, Headless UI). If a kit was selected, prefer wrapping its primitives; otherwise hand-roll minimal components.
   If `ARCHITECTURE.md` is silent on a choice, default to: hand-rolled primitives with vanilla CSS-in-JSX (inline `style` props or `className` against a single co-located `ui.css`). Document the assumption with a one-line TS comment in `index.ts`.

2. Read `packages/mission-control-frontend/package.json` to confirm the framework dependency name and version. The import statements you write (`import { useEffect, useRef, useState } from 'react'` for React; equivalent for Solid/Vue) must match what `00-scaffold` actually installed.

3. Read the streaming chunk shape from `packages/mission-control-frontend/src/api/types.ts` if it exists (produced by `01-api-client`). You need the `CommandChunk` type for `OutputPanel`'s prop typing. If the file does not yet exist, define a local minimal type in `OutputPanel.tsx`:
   ```ts
   type CommandChunk = { stream: 'stdout' | 'stderr'; line: string; timestamp?: number };
   ```
   and add a TS comment noting that it should be replaced with the import from `../api/types` once available.

4. Create the directory `packages/mission-control-frontend/src/ui/` (it should already exist as part of the package tree — use `mkdir -p` to be safe).

5. Write `packages/mission-control-frontend/src/ui/Button.tsx`. Props: `{ onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger'; type?: 'button' | 'submit'; children: React.ReactNode }`. Render a `<button>` with `className` keyed off `variant`. Forward `disabled` and `onClick`.

6. Write `packages/mission-control-frontend/src/ui/TextInput.tsx`. Props: `{ value: string; onChange: (next: string) => void; placeholder?: string; disabled?: boolean; type?: 'text' | 'password' | 'number'; id?: string }`. Render an `<input>` that calls `onChange(e.target.value)`.

7. Write `packages/mission-control-frontend/src/ui/Checkbox.tsx`. Props: `{ checked: boolean; onChange: (next: boolean) => void; disabled?: boolean; id?: string }`. Render `<input type="checkbox">` calling `onChange(e.target.checked)`.

8. Write `packages/mission-control-frontend/src/ui/Select.tsx`. Props: `{ value: string; onChange: (next: string) => void; options: Array<{ value: string; label: string }>; disabled?: boolean; id?: string }`. Render `<select>` with one `<option>` per entry.

9. Write `packages/mission-control-frontend/src/ui/FormField.tsx`. Props: `{ label: string; description?: string; error?: string; htmlFor?: string; children: React.ReactNode }`. Render a `<label>` block with the label text, the `children` (the actual control), an optional description paragraph, and an error paragraph styled to indicate failure when `error` is set.

10. Write `packages/mission-control-frontend/src/ui/OutputPanel.tsx`. This is the load-bearing primitive — implement carefully:
    - Props: `{ chunks: CommandChunk[]; running: boolean }`.
    - Render a scrollable `<div>` (e.g. `style={{ overflowY: 'auto', maxHeight: '60vh', fontFamily: 'monospace' }}`).
    - For each chunk, render a `<div>` with `className` or `style` keyed off `chunk.stream` — stdout in default color, stderr in a distinct color (e.g. red/orange).
    - Use `useRef` to hold the scroll container.
    - Use `useState` to track a `pinned` boolean (default `true`).
    - On scroll handler: set `pinned = (scrollTop + clientHeight >= scrollHeight - threshold)` so user scrolling up releases the pin and scrolling back to the bottom re-pins.
    - In a `useEffect` keyed on `chunks.length`, if `pinned` is true, set `container.scrollTop = container.scrollHeight`.
    - When `running` is true and there are no chunks yet, render a small "Waiting for output..." placeholder.
    - Use `useEffect`, `useRef`, `useState` from the chosen framework's hooks API; for non-React frameworks (Solid/Vue), translate to the equivalent reactivity primitives but keep the same observable behavior.

11. Write `packages/mission-control-frontend/src/ui/Card.tsx`. Props: `{ title?: string; children: React.ReactNode; footer?: React.ReactNode }`. Render a bordered container with optional header (title) and footer slots.

12. Write `packages/mission-control-frontend/src/ui/Spinner.tsx`. Props: `{ size?: 'small' | 'medium' | 'large'; label?: string }`. Render a CSS-animated spinner glyph. If `label` is provided, render it next to the spinner with `aria-live="polite"`.

13. Write `packages/mission-control-frontend/src/ui/index.ts` as a barrel:
    ```ts
    export { Button } from './Button';
    export { TextInput } from './TextInput';
    export { Checkbox } from './Checkbox';
    export { Select } from './Select';
    export { FormField } from './FormField';
    export { OutputPanel } from './OutputPanel';
    export { Card } from './Card';
    export { Spinner } from './Spinner';
    ```
    Use named exports (not default exports) so check `barrel-reexports-all` succeeds and consumers can `import { Button, OutputPanel } from '../ui'`.

14. Verify nothing in `src/ui/` imports from `../router`, `../api/client`, `cli-commands.json`, or calls `fetch`/`EventSource`/`WebSocket`. If a primitive needs a type from `../api/types` (only `OutputPanel` for `CommandChunk`), that is allowed — types are erased at build time and do not couple runtime behavior.

15. Run the checks block from the frontmatter mentally before declaring done:
    - All eight `*.tsx` files exist and are non-empty under `src/ui/`.
    - `index.ts` references each primitive name.
    - `OutputPanel.tsx` mentions `stderr`/`stream` and `scroll`/`scrollTop`/`scrollIntoView`.
    - No file under `src/ui/` imports the router, api client module, or `cli-commands.json`.

## Notes

- Framework choice cascades from `ARCHITECTURE.md`. Steps above use React idioms (`useEffect`, `useRef`, `useState`, JSX) as the default. If `ARCHITECTURE.md` selected Solid or Vue, translate the hooks to `createSignal`/`createEffect` (Solid) or `ref`/`watchEffect` (Vue) but keep the same prop shapes and behavior contract.
- Styling approach is intentionally loose — the deliverable is the primitive surface, not pixel-perfect design. The downstream wbs and any visual polish step will iterate on the look.
