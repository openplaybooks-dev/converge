# Spec: quickstart — From zero to converged in 60s

## 1. Section ID + Title

- **ID**: `quickstart`
- **Title**: `From zero to converged in 60s`
- **Component**: `Quickstart` (`apps/landing/src/components/sections/Quickstart.astro`)

## 2. Intent

Three-step terminal walkthrough mirroring the `## Quick Start` block in `README.md`. Each step renders as a copy-button code block. The section shows the minimal path from install to first successful run.

## 3. Content Sources

- Primary: `README.md` — the `## Quick Start` code block (lines 53–58)
- Brand: `apps/landing/.content/brand.json` — palette + voice rules

## 4. Required Props

None. Static section — no props needed.

## 5. Layout / States

- Single static state (not interactive)
- Vertical stack: title → three numbered steps → optional "What's next" link
- Each step: monospace label (`1.`, `2.`, `3.`) + copy-button code block
- Code blocks use `JetBrains Mono` (brand `typography.mono`) on brand `palette.bgElev` background
- Responsive: single column at all breakpoints

## 6. Steps Content

Step 1 — Install:
```bash
npm install -g @converge/core
```

Step 2 — Init:
```bash
converge init --name="my-api"
```

Step 3 — Plan and run:
```bash
converge plan "REST API with health check endpoint and test suite"
converge run
```

## 7. Acceptance Criteria

- Renders without console errors
- Mobile responsive (320px+)
- All copy traces to `README.md` (no marketing-speak)
- Uses brand tokens: `bgElev` for code backgrounds, `text` for labels, `indigo` for copy-button active state (no hardcoded hex)
- Copy button copies the command and shows a brief "Copied!" confirmation

## 8. Banned

- Do not add a fourth step
- Do not include `converge plan` output in the code blocks — only the input command
- Do not reference the example task markdown (lines 62–79 of README.md) — that belongs in docs, not the landing page
