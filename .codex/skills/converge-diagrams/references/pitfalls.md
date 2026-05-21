# Pitfalls that cost iterations

A record of mistakes encountered while building the Converge landing
diagram set. Each entry: the symptom, the cause, and the fix.

## All diagram fills render as browser defaults (white / black)

**Symptom**: Diagrams render with stark white box fills and default
black strokes against the dark page background — clearly unstyled.

**Cause**: A CSS variable name typo. The tokens in
`src/styles/tokens.css` are all named `--color-*` (e.g. `--color-bg`,
`--color-indigo`, `--color-accent`). Writing `var(--bg)`, `var(--cream)`,
or `var(--coral)` (a stale name carried over from another project)
resolves to the CSS fallback value, which for `fill` is browser default.

**Fix**: Use the canonical names from `tokens.css`. If you need a new
semantic name (e.g. `--diagram-data-fill`), add it to `tokens.css` and
let it alias an existing color token — don't invent free-floating names
inside individual primitives.

## Rows/content faded at 35% opacity

**Symptom**: Multiple rows in a diagram all appear dim; only show at
full opacity when the user hovers.

**Cause**: `dg-step` + `dg-step-N` classes. These are designed for
progressive-reveal narratives (e.g., a 3-panel "phase 1 → 2 → 3") where
each step should fade in on hover with stagger. If applied to parallel
rows that should all be visible statically, they fade by default.

**Fix**: Remove `dg-step` from the `<g>` wrapping the row. Only use
`dg-step` when hover-driven reveal is intentional.

## Labels overflow / clip inside narrow boxes

**Symptom**: "Spawn template tasks" sticks out past the box edges.

**Cause**: Early versions used SVG `<text>` which does not wrap. Manual
line-splitting via `lines={['Spawn template', 'tasks']}` worked but was
awkward.

**Fix**: All label-bearing primitives (`DataBox`, `LogicBox`, `TaskCard`,
`TargetBullet`) use `<foreignObject>` with a flex-centered `<div
class="dg-fo-label">`. The browser wraps against the box width. Just
pass `label="..."`.

## Strokes invisible against the dark background

**Symptom**: A `state="changed"` box has a thin accent-red border that
disappears when rendered against `--color-bg`.

**Cause**: Dark-on-dark contrast. A 1px stroke that reads on white
disappears at low saturation against `#0B1120`.

**Fix**: The `dg-state-*` rules in `diagrams.css` bump stroke-width to
2.2 for all delta states, and the hover `dg-delta-pulse` keyframes push
it to 4.2 for extra visibility. Use saturated tokens (`--color-cyan`,
`--color-accent`, `--color-violet`) for state strokes — never muted
text tokens.

## Magic-number insets scatter across call sites

**Symptom**: `<StatusBadge x={TC_X + 14} y={row.tcY + 4} size={12} />`
and `<StatusBadge x={checkX + 6} y={mid - CHECK_H / 2 - 2} size={10} />`
— different offsets, different sizes, invisible coupling to container
dimensions.

**Cause**: Inset values baked into call sites instead of the primitive.

**Fix**: The primitive owns its inset + size. Callers pass the
container's reference corner. The primitive internally does
`translate(x - INSET_X - w, y)`. Same for `TaskCard`'s header and
status badge — the container primitive knows its own dimensions and
handles all internal positioning.

## Source vs target color accidentally diverged

**Symptom**: A source DataBox in cyan, a target DataBox in violet —
suggests a distinction that doesn't exist in the playbook model.

**Cause**: Early `LogicBox` had `variant="source"` / `variant="target"`
modifiers with different fills. Kept around from other-site conventions
that don't apply here.

**Fix**: One neutral elevated fill (`var(--color-bg-elev)`) and one
muted text color for all non-container logic boxes. Shape (not color)
carries the semantic distinction — `TargetBullet` is visually different
from `LogicBox` because of its bullet shape, not because of color. Only
container types (`PlaybookContainer`, `TaskCard`) get an indigo tint
for visual grouping.

## Arrows at different heights hit the wrong target

**Symptom**: `output1` at y=93 points to the playbook root, but the
arrow line crosses over `output2` at y=147 because both converge to the
root's center.

**Cause**: Drawing all arrows to the single y-center of the destination
box.

**Fix**: Keep arrows horizontal — draw each to the destination's left
edge at the *source's* y-coordinate. This only works when destinations
are tall enough to accept multiple horizontal entries. See
[layout-patterns.md](./layout-patterns.md).

## Arrowheads on binding lines

**Symptom**: Task → declared-output and root → owner-pointer both have
arrowheads and moving dashes, making them feel like causal flow.

**Cause**: Using `FlowArrow` everywhere instead of distinguishing flow
from binding.

**Fix**: `Connector` (static, dashed, no arrowhead) for bindings;
`FlowArrow` only for causal flow. A binding is "X is bound to Y" —
task → declared output (the output IS produced by the task), root →
owner (identity, not causation).

## Status badges fill solid, looks too heavy

**Symptom**: Status badges render as dark solid indigo ribbons that
visually dominate small boxes.

**Fix**: Use indigo outline + translucent indigo fill
(`fill: color-mix(in oklab, var(--color-indigo) 22%, transparent)`),
not a solid color. Reads over any background and matches the Converge
accent palette.

## Asymmetric padding inside a container

**Symptom**: Content hugs the left side of a TaskCard/PlaybookContainer
with a big empty gap on the right. Or the first row hugs the top while
the last row has a large gap below.

**Cause**: Hardcoding `APP.w` / `APP.h` to a round number and then
placing content starting at a small `APP_PAD`. The content fits but
leaves whatever remainder on the right/bottom.

**Fix**: Derive the container size from the content, not the other way
around:

```astro
const APP_PAD_X = 24;
const APP_W = TASK_W + GAP + CHECK_W + APP_PAD_X * 2;  // left pad == right pad
const APP = { x: 140, y: TOP_Y, w: APP_W, h: TOP_H };
```

Any downstream sibling (target column, secondary playbook) must then be
positioned relative to `APP.x + APP_W`, not a hardcoded x. Same
principle vertically: compute row y-centers so top-pad == bottom-pad.

See [layout-patterns.md](./layout-patterns.md) "Balanced padding on all
sides" for the full idiom.

## State class on a container cascades into its children

**Symptom**: A `TaskCard` with `cardState='updated'` paints *every*
nested `.dg-box` (sub-tasks, checks, outputs) violet — even the ones
explicitly left at `state='idle'`.

**Cause**: The state CSS rules were written with the descendant
combinator: `.dg-state-updated .dg-box { stroke: violet; }`. The
container's state class matches, and its descendant `.dg-box`
elements inherit the style.

**Fix**: Use the direct-child combinator `>` so the rule only applies
to the box element on the same wrapper `<g>` that owns the state:

```css
.dg-state-new > .dg-box     { ... }
.dg-state-updated > .dg-box { ... }
.dg-state-removed > .dg-box { ... }
.dg-state-changed > .dg-box { ... }
```

Each shape primitive (built on `ShapeGroup`) has its own wrapper
`<g>` with its own state class and its own direct-child `.dg-box`.
With `>`, states never cascade.

## Always-on animations distract on a marketing page

**Symptom**: A spinning status badge keeps spinning even when the user
isn't looking at that diagram — makes the page feel busy and steals
focus from CTAs.

**Fix**: Every animation in `diagrams.css` is **idle by default,
active only on `.dg-root:hover`**. Includes `dg-flow`, `dg-pulse`,
`dg-delta-pulse`, `dg-spin` (running badge), `dg-check-draw`
(passing check). When adding a new animation, gate it the same
way — and register it in the `@media (prefers-reduced-motion: reduce)`
override at the bottom of the stylesheet.

The site already opts into reduced-motion in a few places (see
`ConvergenceJourney.astro`); follow that precedent.

## Reporting complete without looking

**Symptom**: "The build succeeded, diagram done." Then user screenshots
show overlaps / unstyled boxes / faded content.

**Fix**: Always run `scripts/preview.sh` and `Read` the PNG before
reporting. A clean `pnpm build` proves only that the Astro components
compile.
