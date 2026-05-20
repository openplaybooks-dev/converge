# Layout patterns

Idioms for composing legible diagrams from the shape-semantic primitives
on the Converge landing site.

## Config block at top

Every non-trivial diagram starts with a config block of named constants.
Don't sprinkle magic numbers.

```astro
---
const VB_W = 980, VB_H = 380;
const TOP_Y = 30, TOP_H = 330;

const SRC     = { x: 20,  y: TOP_Y, w: 110, h: TOP_H };
const PLAYBK  = { x: 160, y: TOP_Y, w: 664, h: TOP_H };
const TARGET  = { x: 844, y: TOP_Y, w: 110, h: TOP_H };

const TC_W = 510, TC_H = 128;
const ROW1_CY = 130, ROW2_CY = 268;
// ...
---
```

Changing one constant re-flows the diagram; no hunting through JSX.

## Horizontal arrows by default

When source and destination both have a vertical extent, route arrows
horizontally rather than angled. Looks more polished; reads faster.

To enable this, align sibling containers (source column, playbook
container, target column) at the same `y` and `height`. Then row-specific
arrows enter/exit at the row's y-coordinate and stay level.

```astro
<FlowArrow d={`M ${SRC.x + SRC.w} ${row.rowCY} L ${INPUT_X} ${row.rowCY}`} />
```

## Bindings vs flow

- **FlowArrow**: causal flow (A produces B, A transforms to B, parent
  body fans out to children). Indigo dashed arrow with arrowhead and
  subtle drift animation.
- **Connector**: binding / identity (A is bound to B, A declares B).
  Static, dashed, no arrowhead.

Concrete rules for the Converge model:

- Playbook root → owner / metadata: binding. `Connector`.
- Playbook root → task: flow (the playbook spawns the task). `FlowArrow`.
- Parent task body → child task: flow. `FlowArrow`.
- Task → declared output file: binding (the file IS produced by the
  task). `Connector`.
- Task body → check: flow (the check runs against the body). `FlowArrow`.
- Check → result.jsonl row: binding. `Connector`.

## Balanced padding on all sides

Inside every container — `PlaybookContainer`, `TaskCard`, or any
`LogicBox` with a slot — keep **padding equal on all four sides**: left
== right, and top == bottom. Asymmetric padding is the single most
common visual smell. The fix is always the same: derive the container
size from content, not the other way around.

### Horizontal: derive container width from content

**Wrong** (guess container width, scatter content inside):

```astro
const PLAYBK = { x: 140, y: TOP_Y, w: 700, h: TOP_H };  // guessed
const INPUT_DX = 24;
const TC_DX    = INPUT_DX + INPUT_W + 34;
const TC_W     = 360;
// Right padding: 700 - (TC_DX + TC_W) = 256. Way more than left 24.
```

**Right** (compute container width from what it actually holds):

```astro
const PLAYBK_PAD_X = 24;
const INPUT_W = 62;
const TC_W    = 360;
const INPUT_TO_TC_GAP = 34;
const PLAYBK_W = INPUT_W + INPUT_TO_TC_GAP + TC_W + PLAYBK_PAD_X * 2;
// PLAYBK_W = 484. Left pad 24 = right pad 24 by construction.

const PLAYBK    = { x: 140,                 y: TOP_Y, w: PLAYBK_W, h: TOP_H };
const TARGET_R  = { x: PLAYBK.x + PLAYBK_W + 20, y: TOP_Y, w: 100, h: TOP_H };
```

For a horizontal content row:

```
[pad_x] col1 [gap] col2 [gap] … coln [pad_x]
```

Set `container_w = sum(cols) + (n-1) * gap + 2 * pad_x`. Then left ==
right by construction; adding or removing columns stays balanced without
re-tuning.

### Vertical: same rule, stacked axis

If a container has a single content row, vertically center it:
`content_y_top = (container_h - content_h) / 2`.

If it has multiple rows (e.g. two TaskCards inside a PlaybookContainer),
choose `ROW1_CY` and `ROW2_CY` so the first row's top padding equals the
last row's bottom padding:

```
top_pad == row1_top - container_top  ==  container_bottom - rowN_bottom
```

Don't forget the container's own top header label (~28px high) eats
into the usable top area — count it toward "top padding" or keep row
content below it.

### Downstream siblings reference the derived width

When the container sits among siblings (source column, target column),
place each sibling relative to `PLAYBK.x + PLAYBK_W`, not a hard-coded
x. Otherwise, changing inner layout silently breaks the outer spacing.

```astro
const SIBLING_GAP = 20;
const TGT = { x: PLAYBK.x + PLAYBK_W + SIBLING_GAP, y: TOP_Y, w: 100, h: TOP_H };
const VB_W = TGT.x + TGT.w + 20;  // viewBox also derived
```

This prevents the "content hugs left edge, right side floats in space"
look seen when container widths are guessed independently of content.

## Compactness

Default to compact. The landing-site section column is ~960px on
desktop and narrower on mobile, so most diagrams render at `maxWidth`
between 720 and 960. Extra vertical whitespace between sibling elements
distances them conceptually — only add padding when the spacing conveys
meaning.

When stacking two rows (e.g., two TaskCards), the inter-row gap should
be small enough that they feel like variations of the same thing, not
separate ideas.

Remember the page is dark-themed and content-dense — diagrams that
stretch full-bleed start to feel disconnected from the surrounding
prose. Keep them visually anchored inside the section padding.

## Slotted containers use local coordinates

`TaskCard` places its rect at `translate(x y)` and renders `<slot />`
inside. Children in the slot use coordinates relative to the container's
top-left.

```astro
<TaskCard x={TC_X} y={row.tcY} w={TC_W} h={TC_H} status="passing">
  {/* (0,0) here = container's top-left */}
  <LogicBox x={TC_PAD} y={(TC_H - BODY_H) / 2} ... />
</TaskCard>
```

Anything that visually crosses out of the container (e.g., a task →
target connector) must be drawn OUTSIDE the TaskCard tag, in absolute
coords.

## Two coord spaces in one loop

A typical row iteration touches both:

```astro
{rows.map((row) => (
  <g>
    {/* absolute coords: outer layout */}
    <Connector d={`M ${SRC.x + SRC.w} ${row.rowCY} L ${INPUT_X} ${row.rowCY}`} />
    <DataBox x={INPUT_X} y={row.rowCY - INPUT_H/2} ... />
    <FlowArrow d={`M ${INPUT_X + INPUT_W} ${row.rowCY} L ${TC_X} ${row.rowCY}`} />

    <TaskCard x={TC_X} y={row.tcY} w={TC_W} h={TC_H} status="passing">
      {/* local coords: inside the TaskCard */}
      <LogicBox x={TC_PAD} y={(TC_H - BODY_H)/2} ... />
      {/* ... */}
    </TaskCard>

    {/* absolute coords again: exits from TaskCard to outside destinations */}
    {outputCYs.map((cy) => (
      <Connector d={`M ${TC_X + OUT_DX + OUT_W} ${cy} L ${TGT.x} ${cy}`} dashed={true} />
    ))}
  </g>
))}
```

Keep external-space and internal-space blocks visually separated in the
source for readability.

## Row centers drive child positions

Define `ROW_CY` for each row up front, then derive input y, task body
y, output y, etc. from it. This way shifting a row vertically only
requires changing `ROW_CY`, not every child.

## Status badges are declarative

Never place `<StatusBadge>` directly unless you're writing a brand new
container primitive. Instead pass `status="passing"` / `"running"` /
`"failing"` to `LogicBox` or `TaskCard`, and the primitive renders the
badge at the top-right corner with consistent inset and size.

## Delta state + run status

Every shape primitive (`DataBox`, `LogicBox`, `TargetBullet`,
`TaskCard`) accepts two orthogonal annotation props:

- `state` — one of `new` (cyan fill, just-spawned), `updated`
  (violet fill, re-run in place), `removed` (accent-red fill +
  struck-through label + hover tooltip "removed"), or `changed`
  (thin accent stroke, for output-fingerprint invalidation). Default
  `idle`.
- `status` — `passing` (cyan check badge, top-left), `running`
  (indigo spinning arrow, top-left), or `failing` (accent-red dot,
  top-left). Only valid on `LogicBox` / `TaskCard`.

The two can combine: e.g. a re-running task would have
`state="updated"` + `status="running"`. A `state="removed"` element
auto-suppresses the status badge — nothing to check on a removed
task.

## The scenario pattern for multi-state diagrams

Don't create one `.astro` wrapper per "what if" scenario. Instead,
parametrize the base diagram with a `scenario` prop and inline the
scenario in the `.mdx` (blog post) or `.astro` (section) right next to
the prose that describes it:

```mdx
<PlaybookLifecycle scenario={{ tasks: [
  { name: 'fetch', status: 'passing', outputs: [
    { label: 'page.html', status: 'passing' },
  ] },
  { name: 'parse', state: 'updated', status: 'running', outputs: [
    { label: 'records.jsonl', status: 'passing' },
    { label: 'errors.jsonl', state: 'removed' },
    { label: 'meta.json', state: 'new' },
  ] },
]}} />
```

The scenario is *content* (which task is re-running? which output was
fingerprint-invalidated?), not a reusable component. Inlining it in
the page next to the prose keeps the "what am I showing" and "what am
I saying" together, so future edits don't drift.

## Build new shape primitives on `ShapeGroup`

If you find yourself writing a new shape primitive, compose it on top
of `ShapeGroup` (not from scratch). `ShapeGroup` absorbs the wrapper
`<g transform="translate(x y)">`, base-class + state + highlight
class composition, the native `<title>removed</title>` tooltip for
removed elements, and the optional `StatusBadge` rendering with
removed-state suppression. Each primitive just slots in its own shape
+ label.
