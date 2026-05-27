# Converge — Design System

A captured design system for **Converge**, the open-source framework for long-running AI agents that adapt until outcomes converge. This system is optimised for surfaces that show **playbook task trees** and **human-review flows** — accept, request changes, reject, leave feedback.

> **Status:** Captured from `openplaybooks-dev/converge` and `openplaybooks-dev/converge-landing`. Editorial chrome conventions (eyebrow rails, side-rail rotated tracked text, monospace coordinate strings) borrowed from `nexu-io/open-design` and adapted to the Converge palette.

---

## What is Converge?

Converge runs autonomous AI coding agents (Claude, Codex, Gemini, Kimi, Qwen…) through a chain of tasks defined as a reusable, shareable **playbook**. Each task is a `TASK.md` that declares:

- **Outputs** — what file(s) the task must produce on disk.
- **Checks** — shell commands whose exit code proves the outputs are real.
- **Dependencies** — which other tasks must finish first.

The runner builds a DAG from these declarations, runs tasks in parallel where it can, retries failures with structured context, **resets the context window at every task boundary** so long-running work stays affordable, and journals everything to `.converge/journal/` so a killed run can resume instead of restart.

The mental model is **diverge → converge**: break the goal into independent pieces, run them in parallel, assemble the result. Recursive — any piece can itself diverge.

> *"Define done. Converge gets there."* — brand tagline

### Where this design system focuses

The system has visual coverage for the whole product, but the **playbook + review flow** is the centerpiece:

- **Playbook overview** — task tree, status counters, run journal entries
- **Task detail** — outputs, checks, dependencies, retries, last-run output
- **Human review** — the surface a maintainer opens when a task lands in `awaiting-review` state. Approve / Request changes / Reject, with structured feedback that the runner consumes on the next wave.
- **DAG diagram** — the `.cv-diagram` subtree that renders the playbook graph itself

---

## Sources

This system was assembled from public materials. Files are **referenced** — the reader needs view access to the repos to inspect originals.

- **Converge engine + docs:** <https://github.com/openplaybooks-dev/converge> · README, `docs/`, `examples/`, `assets/brand/`
- **Converge landing page (canonical brand source):** <https://github.com/openplaybooks-dev/converge-landing> · `src/.content/brand.json` is the single source of truth for tokens, voice rules, and banned words
- **Editorial chrome inspiration:** <https://github.com/nexu-io/open-design> · The `.vaunt`, eyebrow + side-rail conventions, and the italic-emphasis-in-display motif we adapt to Converge's palette

The canonical token / typography / globals CSS from converge-landing is preserved verbatim in `reference/` for cross-reference.

Explore the upstream repos for richer material than is captured here: the full skill catalog (`/converge-planning`, `/converge-control`), the 10+ runnable example playbooks, the RFC drafts, and the DAG-diagram component library.

---

## Index

```
.
├── README.md                       ← this file
├── SKILL.md                        ← Agent-Skills-compatible entry point
├── colors_and_type.css             ← all tokens: colors, type, spacing, radii, semantic CSS classes
├── reference/                      ← upstream Converge CSS/JSON for cross-reference (read-only)
│   ├── converge-brand.json         ← the canonical brand contract — tagline, voice, banned words
│   ├── converge-tokens.css         ← upstream token definitions
│   ├── converge-typography.css     ← upstream type rules + italic-emphasis utility
│   ├── converge-globals.css        ← upstream base styles + status-indicator + link-arrow utilities
│   ├── converge-animations.css     ← scroll-driven reveal animation
│   └── converge-diagrams.css       ← .dg-root SVG primitives (Converge's DAG renderer)
├── assets/                         ← Converge brand assets
│   ├── converge-logo.svg           ← wordmark + page-fold mark (dark variant)
│   ├── converge-banner.svg         ← README banner (dark + violet)
│   ├── converge-favicon.svg
│   └── converge-apple-touch-icon.png
├── preview/                        ← design-system cards rendered in the DS tab
│   └── … (see "Design System cards" below)
└── ui_kits/
    └── playbook/                   ← THE focus: task-tree + review-flow recreation
        ├── README.md
        ├── index.html              ← interactive end-to-end demo (overview → review)
        ├── PlaybookHeader.jsx
        ├── TaskTree.jsx            ← left rail — the DAG as a hierarchical list
        ├── TaskDetail.jsx          ← center pane — outputs, checks, deps, journal
        ├── ReviewPane.jsx          ← right rail — accept / changes / reject
        ├── ReviewFeedback.jsx      ← structured feedback form
        ├── RunJournal.jsx          ← terminal-style journal viewer (dark subtree)
        ├── DagDiagram.jsx          ← .cv-diagram SVG rendering of the playbook
        └── primitives.jsx          ← StatusDot, Pill, Eyebrow, Caption, CodeChip…
```

---

## Content fundamentals

The Converge voice is codified in `reference/converge-brand.json` and we follow it to the letter.

**Tone (from brand.json):**
- **Direct.** Lead with the verb. *"Converge runs autonomous agents through adaptive, multi-step playbooks."*
- **Technical.** Be specific about what you mean. *"Each task declares its outputs and shell-check exit criteria; the adaptive execution loop retries failures and can spawn follow-up tasks that match the shape of the project at runtime."*
- **Honest about trade-offs.** Surface costs and caveats inline. *"A playbook can consume tens of millions of tokens. Use a cheap model."*

**Banned words (do not ship copy containing these):**
`revolutionary` · `next-generation` · `AI-native` · `game-changing`. Treat as compile-time lint.

**Preferred words:**
`concrete` · `shipped` · `measurable` · `verifiable`. The product earns these by emitting real outputs and proving them with real checks; the copy should reinforce that.

**Person & tense.** Third-person product voice, second-person calls to action. *"Converge dispatches AI agents that call LLM APIs"* / *"Use a cheap model"*. "We" appears only inside the contributor docs.

**Casing.**
- **Sentence-case prose and headings.** No title case.
- **Lowercase technical nouns.** `claude`, `codex`, `gemini`, `kimi`, `qwen`, `converge run`, `TASK.md`. Product files and skills keep their literal casing.
- **All-caps tracked mono** for data captions: `~250 TASKS · Δ 12 LIVE · ✓ 184 PASS`. This is the eyebrow voice — never used in body copy, always in `<span class="cv-caption">`.
- **`/converge-planning`** and **`/converge-control`** are the two bundled skills — always with the leading slash and in backticks.

**The italic-emphasis motif.** The single most important typographic rule:

> Wrap the *one word* in a body sentence that carries the actual emphasis in `<em>`. It will render in **Crimson Pro Italic 500 terracotta** (`#BE5133`). Use it sparingly — at most one or two per paragraph — for the noun the sentence is really about.
>
> *"Converge runs AI coding agents through a chain of tasks defined as a **reusable, shareable** playbook."* — both words italicised because both are the point.

**Punctuation rhythm.**
- Em-dash `—` between two clauses that build on each other.
- Mid-dot `·` between items in a caption strip (`~250 TASKS · Δ 12 LIVE`).
- Bold reserved for technical nouns introduced for the first time.
- Arrow glyphs as typography: `→` is the link-arrow utility (`.cv-link-arrow` appends one), `←` for back-nav, `Δ` for delta states.

**Numbers are visible.** Converge is comfortable with concrete numbers. Headlines name counts (`10 playbooks`, `5 providers`, `tens of millions of tokens`). Stats are footed with provenance: *"138 MiniMax sessions, $0.61 USD, 41k events, 13 screens"* (from the `converge-example-baby-app` showcase).

**Emoji policy.** Restrained. The README uses `⚠️` for warnings only. Status indicators are typographic glyphs — `✓` `Δ` `✕` `●` — colored via `.cv-status--*`, never emoji.

**Voice in action — examples:**
- Hero: *"Long-running AI agents that adapt until **outcomes converge**."*
- Section opener: *"Most 'agent skills' today are prompts: instructions written down once, with the hope the agent follows them next time. That works for a single step and falls apart across many, because nothing enforces that each step's output is real before the next one consumes it."*
- Cost callout: *"A playbook can burn tens of millions of tokens; the price gap matters."*
- Anti-marketing line: *"That's the loop that adapts when reality breaks the plan."*

**What to avoid.**
- Curiosity-gap headlines ("This one trick", "You won't believe").
- Adjective ladders ("powerful, modern, seamless").
- Phrases from the banned-words list — `revolutionary`, `next-generation`, `AI-native`, `game-changing` — and their synonyms (`paradigm shift`, `cutting-edge`, `industry-leading`).
- Stats without provenance.
- Title-cased headings or All-Caps body words.

---

## Visual foundations

### Color philosophy
**One palette, three scopes.** The system is intentionally narrow:

1. **Body palette** — cream paper background (`#F6F4E9`), ink text (`#111827`), hairline border (`#E7E2D1`). This covers everywhere.
2. **Status palette** — `✓ #10B981` ok, `Δ #F59E0B` delta, `✕ #FB6A76` fail, `● #27E62B` live. **Data-viz only.** Never in body text, never in a link, never in a CTA fill, never in a heading.
3. **Accent (terracotta)** — `#BE5133` for body italic-emphasis (the brand motif), link hover, and the `.cv-highlight` wash. **Three uses only.**

Diagram interiors get a separate saturated palette (indigo, violet, cyan, rose) under the `.cv-diagram` scope, because a DAG renders better against deeper cream with vivid nodes than against the soft body bg.

The brand does **not** use terracotta as a CTA fill — that's an ink-fill button (`var(--cv-text)` on `var(--cv-bg)`). This is what keeps italic-emphasis loud.

### Typography
- **All sans is Inter** — body, display, h1 through h4. **Headings are weight 400**, not 700 or 800. The Converge h1 reads quiet because it is huge and tightly tracked (`-0.04em`), not because the strokes are heavy. Avoid bold display weights — that's the AI-marketing-headline trope the brand actively rejects.
- **Mono is JetBrains Mono** — code, file paths, run ids, terminal output, eyebrow captions.
- **Serif is Crimson Pro Italic** — but only inside `<em>` body emphasis and the `.cv-display-serif` utility. There is **no upright serif** in the system.
- **No display-only typeface.** The brand intentionally uses one sans across every size to keep the page feeling like a working document, not a marketing piece.

### Spacing
1rem (16px) base, Tailwind ramp: `1 · 2 · 3 · 4 · 6 · 8 · 10 · 12 · 16 · 20 · 24 · 32` (in `0.25rem` units = 4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 / 64 / 80 / 96 / 128 px). Sections breathe — `padding: var(--cv-space-20) 0` is the floor for a hero, `var(--cv-space-12)` for a content section.

### Backgrounds
- **App chrome:** flat `#F6F4E9`. No gradients, no patterns, no textures, no paper noise. The cream is achieved by the hex itself.
- **Elevated panels** (header strip, side rails, code blocks, popovers): `#EFE9D6` — a 1-step-deeper cream. Elevation is a background shift, not a shadow.
- **Code / terminal / journal:** `#0B1020` (deep ink-indigo). White-on-near-black, JetBrains Mono.
- **Dark sections** (the run journal viewer, a presentation-mode DAG): swap to `[data-theme="dark"]` which remaps everything but the status palette.

### Animation
- **Easing default:** linear or `ease` 150ms for hover transitions; the brand does not use bouncy curves.
- **`prefers-reduced-motion` is respected** — `reference/converge-animations.css` shows the canonical `@media (prefers-reduced-motion: reduce)` block. Honour it everywhere.
- **Scroll-driven reveals** (`.reveal-on-scroll`) fade in 20px from below as the element enters the viewport. Uses CSS `animation-timeline: view();` — no JS.
- **Pulse** — `.cv-status--live` pulses opacity 1 → 0.4 on a 1.4s `ease-in-out` loop. Used only on the green `●` running indicator.
- **No marquees, no parallax, no spring physics.** The brand is a working document, not a showcase.

### Hover & press states
- **Links in body copy:** color shifts to `--cv-accent-warm` (terracotta), the existing `text-decoration` shifts to match. 150ms ease.
- **Link-arrow (`.cv-link-arrow`):** the `→` glyph translates 2px right.
- **Buttons:** background steps one notch — `bg-elev → border` for ghost, `text → #000` for primary. No transform lift.
- **Press:** no scale, no shadow change. The brand barely uses press states.

### Borders & lines
- **Hairline `1px solid var(--cv-border)`** is the system's structural rhythm. Everything is gridded against hairlines — task rows, journal entries, review verdict pills, section dividers.
- **Strong border** (`#D1CDB8`) appears on hover and on a focused / pressed surface — one step.
- **Dashed borders** are reserved for "deferred / spawn-pending" task states in the tree view.
- **Dotted borders** are not used.

### Shadows & elevation
- **The system is functionally flat.** Cards rest on a background shift (bg → bg-elev), not on a shadow.
- **One shadow exists:** `--cv-shadow-pop` — a soft 8px drop for menus, popovers, and the review feedback flyout. That's it.
- **No glows, no inner shadows, no rim lights.** A glow on a control is a signal that something is wrong with the contrast hierarchy — fix the contrast, don't add a glow.

### Layout rules
- **Three-pane workspace** is the canonical playbook layout: task tree (left rail, ~280–320px), task detail (center, fluid), review pane (right rail, ~360–420px, slides in on demand).
- **Fixed elements:** the page header strip (~56px) is sticky. Side rails (when used) are fixed at 36–44px wide on either edge.
- **Container max-width:** content surfaces cap at 1400px; long-form docs at 720px.
- **Grid columns:** the DAG diagram uses 12-column inside `.cv-diagram`; the rest of the app uses CSS grid as needed (no fixed grid).
- **Density:** chat / journal lines pack at 0.875rem (14px). Task tree rows are 36–40px tall.

### Transparency & blur
**Almost none.** A single allowed use: the popover/menu shadow has a slight alpha on the ink-shadow, that's the limit. **No `backdrop-filter: blur()`** anywhere. The cream paper is opaque on purpose.

### Corner radii
- **2px** on buttons, pills, inputs, status indicators, code chips, task rows, journal lines — the brand's hallmark sharp-edge feel.
- **4px** on cards, diagram frames, large containers, the dark code panel.
- **No `border-radius: 999px`** (pill / capsule) anywhere. The brand intentionally avoids the rounded-pill aesthetic.

### Imagery vibe
The product itself contains no decorative imagery. The marketing assets (banner, social cards) live under `assets/` and use a separate violet-gradient + page-fold-with-RYG-crease mark on a dark `#0F172A` background — that's the *only* place those purples and the gradient wordmark appear. Inside the app, the brand is monochrome cream + ink + status colors.

### Components — what cards look like
- **Task card:** `bg-elev` background, 1px `border` hairline, 2px radius, 0.75rem padding. Status indicator at the leading edge (`✓` / `Δ` / `✕` / `●`). Title in `cv-h4`, then a caption line in mono uppercase.
- **Review verdict card:** same skeleton, but the border picks up the verdict color (`approved` green-300, `changes` amber-300, `rejected` rose-300) and an inset `bg-elev` band on the left edge mirrors the verdict color at 12% alpha.
- **Journal entry:** mono row in the dark code subtree. Leading timestamp dim, status glyph in saturated color, then the message line.

---

## Iconography

Converge uses **two icon systems**, both monoline:

1. **Lucide Icons** (the open-source icon set) — used in the app chrome for nav, toolbar, tree-row affordances (chevrons, dots, file glyphs, retry/restart icons). 1.5px stroke at 16–20px. CDN-linked: `<link href="https://unpkg.com/lucide-static@latest/font/lucide.css" rel="stylesheet">`. If you need a specific icon and can't find it in the upstream landing-page's `src/icons/`, substitute Lucide and **note the substitution** inline.
2. **Hand-crafted SVG** for diagram primitives — the page-fold mark, the diverge/converge nodes, the spawner triangle. Live in `reference/converge-diagrams.css` as scoped CSS-in-SVG primitives.

**Status-indicator glyphs as typography.** The four status marks are characters set in JetBrains Mono, not SVG icons:
- `✓` — ok / cached / pass — `.cv-status--ok`
- `Δ` — delta / changed / in-progress — `.cv-status--delta`
- `✕` — fail / blocked — `.cv-status--fail`
- `●` — running (pulses) — `.cv-status--live`

Treat them as type. They size with surrounding text, color via CSS vars.

**Unicode in copy.** `→`, `↗`, `←`, `Δ`, `·`, `—`, `✓`, `✕` are part of the voice. Use them as punctuation, not as decoration.

**Emoji.** Used only in README admonitions (`⚠️`). The product chrome contains **zero** emoji.

**Brand mark.** The page-fold-with-RYG-crease symbol — a triangle bisected by a diagonal RYG (red-yellow-green) gradient line that reads as a "page being closed". Encodes diverge-converge geometrically. Single mark, used at all sizes; never recolored. See `assets/converge-logo.svg`.

> ⚠️ **Flagged substitution:** the landing page self-hosts Inter, JetBrains Mono, and Crimson Pro via `@fontsource-variable/*`. This system loads them from the Google Fonts CDN for portability. Both render essentially identically; if you need byte-for-byte parity (especially for the Crimson Pro italic axis), drop the variable woff2 files into `fonts/` and replace the `@import url(...)` in `colors_and_type.css` with `@font-face` rules.

---

## Design System cards

Cards in `preview/` render in the Design System tab. They are split one-concept-per-card:

| Card | Group | What it shows |
|---|---|---|
| `01-color-body.html` | Colors | Body palette — bg, bg-elev, bg-code, text, text-muted, text-dim, border, border-strong |
| `02-color-status.html` | Colors | `✓` `Δ` `✕` `●` data-viz palette + usage rules |
| `03-color-accent.html` | Colors | Terracotta — three allowed uses (italic-em, link hover, highlight) |
| `04-color-review.html` | Colors | The four review-verdict colorways |
| `05-color-diagram.html` | Colors | The `.cv-diagram`-scoped palette (indigo / violet / cyan / rose) |
| `06-type-display.html` | Type | h1 / h2 specimen — weight 400, tight tracking |
| `07-type-headings.html` | Type | h3 / h4 / body / small ramp |
| `08-type-italic-emphasis.html` | Type | The brand motif — Crimson Pro Italic terracotta `<em>` in body copy |
| `09-type-mono.html` | Type | JetBrains Mono — code chip, file path, caption strip, eyebrow |
| `10-spacing-scale.html` | Spacing | 4 → 128px ramp |
| `11-radii.html` | Spacing | 2 / 2 / 4 — the three radii, mapped to their roles |
| `12-borders.html` | Spacing | Hairline / strong / dashed (spawn-pending) |
| `13-shadow-pop.html` | Spacing | The one allowed shadow + when to use it |
| `14-button-primary.html` | Components | Ink-fill primary CTA (not terracotta) |
| `15-button-review.html` | Components | Approve / Changes / Reject — the review verdict trio |
| `16-status-indicators.html` | Components | The four glyph-as-type marks in context |
| `17-pill-tags.html` | Components | Generic pill + the four review-state pills |
| `18-task-row.html` | Components | A single task row from the tree |
| `19-review-verdict-card.html` | Components | The review card skeleton (one for each verdict) |
| `20-link-styles.html` | Components | Default / hover / link-arrow / link-emdash |
| `21-brand-mark.html` | Brand | Logo / wordmark / favicon / banner |

---

## UI Kit

[`ui_kits/playbook`](ui_kits/playbook/) is the centerpiece — an interactive three-pane recreation of the playbook task view + human-review flow. Open `index.html` to walk through:

1. **Playbook overview** — task tree with status counters in the page header
2. **Task detail** — outputs declared, checks defined, last-run journal preview
3. **Review pane** — slides in from the right when a task lands in `awaiting-review`
4. **Submit a verdict** — Approve, Request changes (with structured feedback), or Reject
5. **DAG view** — toggle from list to graph in `.cv-diagram` subtree

See its `README.md` for the component list and which screens map to which page in the original product.

---

## Iterating

`colors_and_type.css` is the source of truth. When the upstream `reference/converge-tokens.css` changes, mirror the diff here.

If you find a copy line that uses a banned word from `brand.json`, treat it as a bug. The brand contract is enforced; the design is the consequence.
