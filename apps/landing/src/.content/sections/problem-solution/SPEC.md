# Section Spec: problem-solution

## 1. Section ID + Title

- **id**: `problem-solution`
- **title**: `Define how vs. define done`

## 2. Intent

Side-by-side comparison: left panel shows imperative step-driven framework code (LangGraph-style nodes-and-edges); right panel shows declarative converge `TASK.md`. Visualizes the paradigm flip — imperative "define how" vs. declarative "define done."

## 3. Component

- **Name**: `ProblemSolution`
- **Location**: `apps/landing/src/components/sections/ProblemSolution.astro`
- **Framework**: Astro (static, two-column layout)

## 4. Content Sources

| Source file | Used for |
|---|---|
| `docs/concepts/dynamic-work-breakdown.md` | The "pre-declared-graph problem" section — the three patterns that don't fit fixed DAGs |
| `apps/landing/.content/brand.json` | Palette tokens (`--cv-bg`, `--cv-indigo`, etc.), tagline voice |
| `docs/concepts/deterministic-checks.md` | Comparison framing (optional — reference for what converge replaces) |

No other sources are valid for this section.

## 5. Required Props

None — `ProblemSolution` renders a static comparison section with no props.

## 6. Layout / States

Two-column side-by-side layout:

```
[Section title: "Define how vs. define done"]
[Left column header: "Imperative — define the steps"]
[Left column: code snippet — LangGraph-style DAG]
[Right column header: "Declarative — define the done state"]
[Right column: converge TASK.md snippet]
```

- **Desktop**: equal-width two columns, code blocks with syntax highlighting
- **Mobile (320px+)**: stacked vertically, left column on top

Single static state. No tabs, no disclosure.

## 7. Acceptance Criteria

- [ ] Renders two-column layout with left/right code panels
- [ ] Left panel shows imperative framework pattern (node-edge style, from the "pre-declared-graph problem" concept in `docs/concepts/dynamic-work-breakdown.md`)
- [ ] Right panel shows converge `TASK.md` declarative style
- [ ] No console errors on load
- [ ] Mobile responsive at 320px (stacked columns)
- [ ] All copy traces to a real source file — no marketing-speak invented in this section
- [ ] All color values use brand tokens (e.g. `var(--cv-bg)`, `var(--cv-indigo)`) — no raw hex in component
- [ ] Code snippets use monospace font from `brand.json` typography (`JetBrains Mono`)

## 8. Banned

- Hardcoded hex colors (use brand tokens only)
- Invented copy not traceable to `docs/concepts/dynamic-work-breakdown.md` or `brand.json`
- Single-column layout on desktop
- Code snippets that don't reflect the actual paradigm contrast (imperative vs. declarative)