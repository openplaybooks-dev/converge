---
name: converge-diagrams
description: This skill should be used when creating, editing, or reviewing inline SVG diagrams for the Converge landing site (anything under src/pages/**, src/components/sections/**, or src/content/blog/**). It encodes the component-based primitive system under src/components/diagrams/, the Converge dark-theme palette + shape semantics, the preview-and-verify loop using headless Chrome against the Astro dev/preview server, and the pitfalls that cost iterations to discover. Trigger phrases include "add a diagram to the landing page", "edit the Architecture diagram", "replace the SVG in the Hero", "make a diagram for the FeatureGrid", "draw the playbook lifecycle", "illustrate convergence", "check how the diagram looks".
---

# Converge Landing Diagrams

Inline SVG diagrams on the Converge landing site are authored as Astro
components under `src/components/diagrams/`, composed from shape-semantic
primitives that share the site's dark-theme palette and styling. One-off
inline `<svg>` blocks inside section components (e.g.
`ConvergenceJourney.astro`) are legacy decoration — always build new
explanatory diagrams with the primitives so they stay consistent across
the page.

## When this skill applies

Apply this skill when:

- Adding a new diagram to a landing-page section (`.astro` under
  `src/components/sections/` or `src/pages/`).
- Adding or editing a diagram inside a blog post (`.mdx` under
  `src/content/blog/`).
- Editing or replacing an existing diagram component under
  `src/components/diagrams/`.
- Reviewing a rendered diagram for layout or style issues.
- Reworking a legacy one-off inline `<svg>` into the primitive system.

Do not apply for:

- Pure decorative animations (e.g. `ConvergenceJourney.astro`) that
  exist only to set mood — they aren't trying to explain anything and
  don't need shape semantics.
- General SVG editing outside `src/components/diagrams/` (icon files,
  social cards, OG images).

## The canonical reference

Read `src/components/diagrams/README.md` **first**. It documents the
shape vocabulary, palette vars from `src/styles/tokens.css`, shared CSS
classes, animation conventions, directory layout, and the MDX/Astro
embedding pattern. This SKILL.md assumes that reference is current — do
not duplicate it here.

If `src/components/diagrams/` does not exist yet on this branch, the
first diagram drop must scaffold it. Use the starter template under
[assets/starter.astro](assets/starter.astro) and add a `README.md`
alongside it that captures the palette/shape vocabulary you adopt.

Then consult the three references bundled with this skill for the
session-specific knowledge that isn't in the project README:

- [references/workflow.md](references/workflow.md) — the preview loop (Astro dev server / `astro build && astro preview` + headless Chrome), how to crop and view output, rebuild discipline.
- [references/pitfalls.md](references/pitfalls.md) — the traps that repeatedly cost iterations (dg-step opacity, color unification with dark theme tokens, magic-number insets, labels without auto-wrap).
- [references/layout-patterns.md](references/layout-patterns.md) — layout idioms (horizontal arrows, symmetric padding, compactness, bindings vs arrows).

## Core procedure

When asked to create or edit a diagram, proceed in this order:

### 1. Read the reference materials

Load `src/components/diagrams/README.md` plus the three references
above. Skim, don't memorize — refer back when designing.

### 2. Design the layout before writing code

Sketch positions with concrete numbers in a config object at the top of
the `.astro` file. Prefer absolute coordinates with a `viewBox` sized to
content, and use named constants for box dimensions and column offsets.

**Derive container size from content, not the other way around.** Start
from inner widths, gaps, and pad; compute `APP_W = sum(cols) + (n-1) *
GAP + 2 * APP_PAD_X`. Downstream siblings reference `APP.x + APP_W`,
not a hardcoded x. Same for vertical: pick row centers so top-pad ==
bottom-pad. This keeps padding balanced on all four sides as you
iterate. See [references/layout-patterns.md](references/layout-patterns.md).

### 3. Compose from primitives

Use the shape-semantic primitives:

| Shape | Meaning | Primitive |
|---|---|---|
| Sharp rectangle | Data (task output file, artifact, row) | `DataBox` |
| Round-cornered rectangle | Subsystem / logic (a task body, a check) | `LogicBox` (`memoized` + `status` props, slot) |
| Elevated container with header | A Converge task / playbook node | `TaskCard` (slot in local coords; `status` prop) |
| Indigo-tinted container with header | A Converge playbook / project root | `PlaybookContainer` (slot in local coords) |
| Bullet (flat left, rounded right) | Goal / deliverable state | `TargetBullet` |
| Animated dashed arrow with head | Flow / causation (parent → child run, body → check) | `FlowArrow` |
| Static dashed line, no head | Binding / identity (declared output → file, task → owner) | `Connector` |

Delta state + run status annotations (orthogonal, on any shape):

| Prop | Values | Visual |
|---|---|---|
| `state` | `new`, `updated`, `removed`, `changed`, `idle` | Cyan / violet / accent-red / thin-accent fill (state cascade is prevented by direct-child CSS combinator — see pitfalls). |
| `status` | `passing`, `running`, `failing` | Top-left badge. Passing draws a check on hover; running spins on hover; failing pulses. All suppressed when `state="removed"`. |
| `highlight` | `true` | Thick indigo border for "currently-discussed element" |

New shape primitives should **compose on top of `ShapeGroup`**, not
re-implement the wrapper `<g>` + state class + title + badge logic.

Palette tokens come from `src/styles/tokens.css`:
`--color-bg`, `--color-bg-elev`, `--color-indigo`, `--color-indigo-light`,
`--color-cyan`, `--color-violet`, `--color-accent`, `--color-text`,
`--color-text-muted`, `--color-text-dim`, `--color-border`. Never
hardcode hex values inside a primitive — always go through the token.

### 4. Render labels with foreignObject

All label-bearing primitives (`DataBox`, `LogicBox`, `TaskCard`,
`TargetBullet`) use `<foreignObject>` with a flex-centered `<div
class="dg-fo-label">` so the browser auto-wraps labels against the box
width. Just pass `label="..."` — never pre-split into manual lines.

### 5. Preview and verify before reporting done

Run the preview script bundled with this skill:

```bash
scripts/preview.sh <page-slug>
# Example: scripts/preview.sh /
# Example: scripts/preview.sh /blog/playbook-anatomy
```

The script handles: building the Astro site (`pnpm build`), serving the
`dist/` output on a free port with `pnpm preview` (no base-path
mirroring is needed — this site is rooted at `/`), screenshotting with
headless Chrome at retina-ish density, and printing paths to PNG crops.
Read the PNGs with the `Read` tool to self-check before reporting the
diagram done.

For tight iteration, you can also point the script at the running
`pnpm dev` server via `PREVIEW_DEV=1 scripts/preview.sh <slug>` — that
skips the build but reflects the current source file directly.

Do NOT report a diagram complete based solely on "the build compiled".
Always render and look. Small issues like overlapping labels, dimmed
rows, or wrong arrow styles are invisible from code alone.

### 6. Iterate on visual feedback

Common iterations (see pitfalls for full details):

- Elements faded at ~35% opacity → `dg-step` leaking onto static rows; remove it.
- Boxes rendering with wrong dark fills → CSS variable typo (e.g. `var(--bg-elev)` instead of `var(--color-bg-elev)`); the token names in `tokens.css` are all `--color-*`.
- Labels overlapping → `<foreignObject>` not used, or box too narrow for the string.
- Arrows to wrong targets → mixing absolute vs. TaskCard-local coordinate space.

## Embedding pattern

**Inside a section component** (most landing-page usage) — import with a
path alias from `src` so it works regardless of how the section is
re-organized:

```astro
---
// src/components/sections/Architecture.astro
import PlaybookLifecycle from '@/components/diagrams/concepts/PlaybookLifecycle.astro';
---

<section>
  <h2>How a playbook converges</h2>
  <PlaybookLifecycle />
</section>
```

**Inside a blog MDX post** — import with the same alias:

```mdx
---
title: Anatomy of a Converge playbook
---
import PlaybookLifecycle from '@/components/diagrams/concepts/PlaybookLifecycle.astro';

## The lifecycle

<PlaybookLifecycle />
```

The `@/` alias is wired up in `astro.config.mjs` and resolves to
`./src/`. Use it instead of relative `../../` paths.

## Discipline

- **Shape carries meaning.** Pick primitives by semantics, not "what looks right".
- **No manual line-splitting.** If a label overflows, widen the box or shorten the label.
- **Absolute coords for outer layout; local coords inside slotted containers.** `TaskCard`'s slot renders children with (0, 0) = container top-left.
- **All flow arrows use the same color.** Default indigo; `variant="cyan"` / `"muted"` only when semantically meaningful.
- **Bindings are silent.** `Connector` (static, dashed, no arrowhead) for "X is bound to Y" — e.g. task → declared output file, playbook → owner.
- **Padding balanced on ALL sides.** Left == right inside every container, and top == bottom. Derive the container's width/height from its content (`APP_W = sum(cols) + (n-1)*GAP + 2*APP_PAD_X`); downstream siblings reference `APP.x + APP_W`, not a hardcoded x. See [references/layout-patterns.md](references/layout-patterns.md) "Balanced padding on all sides".
- **Prefer compactness.** Diagrams should read well at landing-page column width (~960px on desktop, narrower on mobile); stretch only when a visual story demands it.
- **Never use `dg-step` for static content.** It's opacity-35% by default and only lights up on hover — reserved for progressive-reveal narratives (e.g. "phase 1 → 2 → 3" walk-through).
- **All animations are idle by default, active on `.dg-root:hover`.** Flow-drift, delta-pulse, check-draw, spin — each gated the same way. No always-on motion on a static page. When adding a new `@keyframes` rule, register it in the `@media (prefers-reduced-motion: reduce)` block at the bottom of `diagrams.css`.
- **State rules in CSS use the direct-child combinator (`.dg-state-X > .dg-box`)**, not descendant. A state class on a container would otherwise cascade into every nested `.dg-box`. Each shape primitive owns its own state on its own `ShapeGroup`-wrapped `<g>`.
- **Compose new shape primitives on `ShapeGroup`**, not from scratch. It owns the wrapper `<g>`, state/highlight class composition, `<title>removed</title>` tooltip, and the status-badge rendering (with suppression when removed). Never re-implement any of that.
- **Multi-state scenario diagrams take a `scenario` prop**, inlined in the MDX or section file next to the prose. Don't create a `.astro` wrapper per scenario — the scenario is content, not a reusable component.
- **Honor the dark theme.** Every primitive uses CSS variables from `tokens.css`. Never hardcode `#fff` or `#000`; always go through `var(--color-bg)` / `var(--color-text)`. This keeps any future light-mode toggle clean.

## Iteration expectations

Expect 2–4 preview cycles for any non-trivial diagram. After the first
render, opacity/color/overlap issues almost always surface that weren't
visible from code inspection. Budget for the loop — don't try to land
the diagram in one shot.

## Starter template

See [assets/starter.astro](assets/starter.astro) for a minimal
shape-semantic diagram skeleton tuned for the Converge dark theme. Copy
and adapt rather than writing from scratch.
