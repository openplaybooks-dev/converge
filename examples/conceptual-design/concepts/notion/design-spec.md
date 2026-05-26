---
version: alpha
name: living-playbook-notion
description: Creative design specification for the Living Playbook — a structured handbook-style interface for task trees, authored in Notion's editorial design language.
---

# Living Playbook — Creative Design Specification
**Brand: Notion | Style: Editorial Handbook**

---

## 1. Brand Interpretation

Notion's soul is a warm, structured editorialism — the feeling of opening a well-designed notebook where everything has its place. It is not playful (despite colorful pastels), not flashy (despite deep navy heroes). It is confident, clear, and quietly premium. The designer respects the reader's intelligence: no decoration that doesn't serve navigation or understanding.

For the Living Playbook, this translates into a document that feels like a beautifully typeset employee handbook — the kind of reference material you'd keep on your desk, not minimize to a tab. The product spec's "paper" metaphor aligns perfectly with Notion's card-and-surface philosophy. Each task is a page in the notebook: white canvas, soft shadows, ink-text. Pastel tints provide gentle visual variety without disrupting the calm reading experience.

**The key Notion characteristics that drive this design:**

- **Notion Sans** (Inter-based) for all text — warm, humanistic, readable at any scale
- **Pastel tint system** — the brand's signature colored cards (peach, rose, mint, lavender, sky, yellow) echo the live product's database property colors, and they carry visual weight without noise
- **Sobriety in geometry** — 8px-rounded buttons (NOT pills), 12px-rounded cards. The design system is rectangular-editorial, not bubbly
- **Hierarchy through type and space** — size, weight, and indentation carry meaning; no decorative lines for their own sake
- **The dark hero tradition** — the deep navy hero band anchors the page; light surfaces rest on it
- **Progressive disclosure** — content is organized to be scanned first, read second, explored third

**What this means for the Living Playbook:**
The interface should feel like a Notion page that is also a technical handbook. Structured, scannable, warm. Color informs status and mode; it does not decorate. The hierarchy is the hero — five levels of depth expressed through indentation, type scale, and card treatment — not through loud background changes.

---

## 2. Page Composition

### Overall Layout

```
┌─────────────────────────────────────────────────────────┐
│  NAV BAR (64px) — logo, playbook name, search, actions   │
├─────────────────────────────────────────────────────────┤
│  HERO BAND (Notion deep navy)                           │
│    Playbook title (large white), description (muted)    │
│    Stats row: X tasks · Y completed · Z duration       │
│    Status legend: pending / running / pass / failed     │
└─────────────────────────────────────────────────────────┘
│                                                         │
│  TABLE OF CONTENTS (sticky sidebar, 240px)              │
│    Visual tree of top-level tasks as nav dots          │
│    Color-coded by status — scannable at a glance        │
│                                                         │
│  CONTENT AREA (fluid, ~900px max)                      │
│    Table of Contents → Task Tree                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Reading flow:** The reader arrives at the navy hero band — their orientation point. Below it, a sticky table of contents on the left anchors navigation, while the main content area on the right shows the full task tree. Scrolling is the primary interaction. The reader flows top-to-bottom, section-by-section, matching the mental model of "reading a handbook."

### Hero Band

Background: `{colors.brand-navy}` (#0a1530). Notion's signature dark band anchors the page.

- **Playbook title**: `{typography.heading-1}` 48px/600, white (#ffffff), negative letter-spacing (-0.5px)
- **Description**: `{typography.subtitle}` 18px/400, muted white (#a4a097), generous line-height (1.5)
- **Stats row**: `{typography.body-sm}` 14px, muted white. Shows task count, completion count, total duration.
- **Status legend**: Horizontal pill row with color-coded status chips. Each chip: `{rounded.full}` background pill in status color with white micro label.

### Content Area

- Background: `{colors.canvas}` (#ffffff) — the white "paper" surface
- Max-width: 960px, centered with `{spacing.xxl}` (32px) side gutters
- Top padding: `{spacing.section}` (64px)
- Bottom padding: `{spacing.section}` (64px)

### Sidebar (Table of Contents)

- Width: 240px, sticky at top: `{spacing.section}` offset
- Background: `{colors.surface-soft}` (#fafaf9)
- Right edge: 1px border `{colors.hairline}` (#e5e3df) — subtle separator
- Top: `{spacing.xl}` (24px) padding; bottom: `{spacing.lg}` (20px)
- **Tree visualization**: Vertical dotted connector lines in `{colors.muted}`, with colored status dots at each top-level task. Hover reveals task title tooltip.
- **Dot size**: 8px diameter circles, color-coded by status. Active task dot pulses softly.
- Click a dot → smooth scroll to that task in the main content area.

### Scroll Behavior

- Smooth scroll (`scroll-behavior: smooth`)
- Sticky nav bar with subtle backdrop blur on scroll
- Active task in sidebar updates as reader scrolls (Intersection Observer)

---

## 3. Typography Scale

**Font family:** Notion Sans (Inter-based). Fallback: Inter, -apple-system, system-ui, sans-serif.

All Notion typography tokens are reused exactly:

| Token | Size/Weight | Line Height | Use |
|---|---|---|---|
| `{typography.heading-1}` | 48px / 600 | 1.15 | Playbook title in hero |
| `{typography.heading-2}` | 36px / 600 | 1.20 | Section/chapter headers (Level 0 gateway) |
| `{typography.heading-3}` | 28px / 600 | 1.25 | Task titles at Level 0–1 |
| `{typography.heading-4}` | 22px / 600 | 1.30 | Task titles at Level 2–3 |
| `{typography.heading-5}` | 18px / 600 | 1.40 | Inline labels, subsection titles |
| `{typography.body-md}` | 16px / 400 | 1.55 | Task descriptions, body text, check labels |
| `{typography.body-sm}` | 14px / 400 | 1.50 | Meta text, status labels, input/output names |
| `{typography.caption}` | 13px / 400 | 1.40 | Timestamps, fine print |
| `{typography.caption-bold}` | 13px / 600 | 1.40 | Badge labels, check result markers |
| `{typography.micro}` | 12px / 500 | 1.40 | Tiny labels (duration, attempt count) |

**Leading principle:** Generous body leading (1.55) matches Notion's documentation readability standard. Display sizes use tighter leading (1.05–1.25) for visual impact.

---

## 4. Color Mapping

### Brand Colors (Semantic Roles)

| Role | Token | Hex | Use |
|---|---|---|---|
| Page background | `{colors.canvas}` | #ffffff | Main content surface |
| Section divider | `{colors.surface}` | #f6f5f4 | Sidebar background, alternate rows |
| Soft surface | `{colors.surface-soft}` | #fafaf9 | Sidebar, subtle containers |
| Nav bar | `{colors.brand-navy}` | #0a1530 | Top nav, hero band |
| Primary CTA / active | `{colors.primary}` | #5645d4 | Active status, mode badge for spawner |
| Brand accent | `{colors.brand-purple}` | #7b3ff2 | Spawner mode icon fill |
| Brand accent | `{colors.brand-teal}` | #2a9d99 | Gateway mode icon fill |
| Success | `{colors.semantic-success}` | #1aae39 | Pass status |
| Warning | `{colors.semantic-warning}` | #dd5b00 | Blocked status |
| Error | `{colors.semantic-error}` | #e03131 | Failed status |
| Border | `{colors.hairline}` | #e5e3df | Card borders, dividers |
| Text primary | `{colors.ink}` | #1a1a1a | Headlines, body |
| Text secondary | `{colors.charcoal}` | #37352f | Descriptions, labels |
| Text muted | `{colors.steel}` | #5d5b54 | Meta, timestamps |
| Text faint | `{colors.muted}` | #bbb8b1 | Disabled, connector lines |

### Status Colors (Specific Hex Values)

| Status | Color | Hex | Badge Background |
|---|---|---|---|
| Pending | Steel gray | #787671 | `{colors.surface}` |
| Running | Notion primary purple | #5645d4 | `{colors.primary}` with 15% opacity background |
| Pass | Success green | #1aae39 | `{colors.card-tint-mint}` |
| Failed | Error red | #e03131 | `{colors.card-tint-rose}` |
| Blocked | Warning orange | #dd5b00 | `{colors.card-tint-peach}` |

### Pastel Tint System (Card Backgrounds)

Used for task type differentiation and visual variety:

| Tint | Hex | Best Use |
|---|---|---|
| Peach | #ffe8d4 | Gateway section headers |
| Rose | #fde0ec | Failed task highlight |
| Mint | #d9f3e1 | Pass status background |
| Lavender | #e6e0f5 | Spawner task cards |
| Sky | #dcecfa | Info callouts, inputs section |
| Yellow | #fef7d6 | Running task highlight |

---

## 5. Spacing System

**Base unit: 4px** (Notion's standard)

| Token | Value | Use |
|---|---|---|
| `{spacing.xxs}` | 4px | Icon-to-text gap, micro padding |
| `{spacing.xs}` | 8px | Badge padding, tight grouping |
| `{spacing.sm}` | 12px | Tag padding, compact lists |
| `{spacing.md}` | 16px | Body paragraph spacing, card padding |
| `{spacing.lg}` | 20px | Task card inner padding |
| `{spacing.xl}` | 24px | Section padding, card spacing |
| `{spacing.xxl}` | 32px | Page gutters, large gaps |
| `{spacing.xxxl}` | 40px | Section separators |
| `{spacing.section}` | 64px | Major section padding |
| `{spacing.section-lg}` | 96px | Hero band padding |

### Nesting Indentation

Each level of depth indents 24px (one `{spacing.xl}`):

| Level | Indent | Spacing After |
|---|---|---|
| Level 0 (gateway) | 0px | 40px between tasks |
| Level 1 | 24px | 32px between tasks |
| Level 2 | 48px | 24px between tasks |
| Level 3 | 72px | 16px between tasks |
| Level 4 | 96px | 12px between tasks |

**Progressive weight reduction:** Deeper levels get slightly smaller type and tighter spacing, but never less readable. The visual hierarchy communicates "depth" without making deep tasks hard to scan.

---

## 6. Nesting Expression — The Core Design Challenge

Five levels of depth must be visually distinct yet part of the same surface. The solution is a combination of **indentation + type scale + card treatment + connector lines**.

### Visual Rhythm

```
Level 0 (Gateway/Section): 36px heading, card-feature background (tint-peach),
  left accent bar 4px in brand-navy, no border, 12px radius
  → Large, commanding, structural

Level 1: 28px heading, card-base (white), 24px indent, left border 2px in hairline
  → Clear sub-section, distinct from parent

Level 2: 22px heading, card-base (white), 48px indent, left border 2px in hairline
  → Standard task, readable at a glance

Level 3: 16px body-md heading, 72px indent, subtle card (surface-soft background),
  1px border hairline
  → Subtask, tighter, less visual weight

Level 4: 14px body-sm heading, 96px indent, no card border, surface-soft background,
  6px radius
  → Fine-grained, minimal presentation
```

### Connector Lines

A vertical dotted line (1px, color `{colors.muted}`, 4px dot, 4px gap) runs at the left edge of each task block, at the indent position of that level. Child tasks connect to their parent via a horizontal line extending from the parent's connector to the child's card. This creates a visual tree that reads like a table of contents.

The connector line runs vertically through the full height of a parent task, connecting all children. When a child task is hovered, both the horizontal connector and the parent's connector highlight in brand-purple (#5645d4, 30% opacity).

### Collapse/Expand

Parent tasks (gateway and spawner) show a chevron icon (Notion-style, 16px, `{colors.steel}`) that rotates 90° on expand. The expand/collapse affects immediate children only — grandchildren remain visible if parent is expanded. An animated height transition (200ms ease) smooths the collapse.

### Progressive Disclosure Strategy

- **Default collapsed at Level 2+**: Children beyond Level 1 are collapsed by default. The reader clicks to expand deeper levels.
- **Click target**: The entire task card header row is clickable — not just the chevron. This matches Notion's behavior of large click targets.
- **Keyboard**: Enter/Space toggles. Arrow keys navigate tree.

---

## 7. Task Type Differentiation

### Gateway (Container)

**Visual treatment:** A section header card with tint-peach (#ffe8d4) background, no border. The title uses `{typography.heading-2}` (36px/600). A page icon (inline SVG, 20px) in `{colors.brand-navy}` precedes the title. The card has no status indicator (gateways are structural, not runtime tasks).

**Signature:** Left accent bar 4px wide in `{colors.brand-navy}`. The entire card is a subtle "chapter heading" — it feels different from task cards because it is a structural element, not a unit of work.

**Children render below the gateway card** with standard indentation. The gateway card itself has no body expansion — it contains other tasks, it is not one.

### Spawner (Dynamic Factory)

**Visual treatment:** A lavender-tinted card (`{colors.card-tint-lavender}`) with a cascade icon (inline SVG, 20px) in `{colors.brand-purple}` (#7b3ff2). The card has a subtle animated shimmer on the left border (brand-purple, 2px wide) when in "running" status — a subtle ambient glow that signals "this is generating children."

**Signature:** A "dynamic" badge in badge-tag-purple style (`{colors.card-tint-lavender}` background, `{colors.brand-purple-800}` text) sits beside the mode icon.

**Expand behavior:** Clicking a spawner card reveals a placeholder message: "Children appear here as they're generated..." (body-sm, steel, italic). This placeholder uses a dashed border (`{colors.hairline}`, 2px dashed) to indicate the area awaiting runtime children.

### Leaf (Worker)

**Visual treatment:** White canvas card with 1px border `{colors.hairline}`. Normal state. A small tool icon (inline SVG, 16px) in `{colors.steel}` precedes the title.

**Signature:** Status is the dominant visual — the green check, red cross, or animated spinner is the first thing the reader sees on each task. The status badge sits at the top-right of the card header row.

**Mode icon:** A small tool icon (Notion-style, 16px, steel) at the left of the title, for leaf tasks.

---

## 8. Status & Data Presentation

### Status Badge

Position: top-right of the task card header. A pill-shaped badge with rounded-full, 4px/10px padding, using `{typography.caption-bold}` (13px/600).

| Status | Badge Style | Background |
|---|---|---|
| Pending | Gray pill (#787671 on #f0eeec) | `{colors.card-tint-gray}` |
| Running | Purple pill (#ffffff on #5645d4) | `{colors.primary}` + subtle pulse animation |
| Pass | Mint pill (#1aae39 on #d9f3e1) | `{colors.card-tint-mint}` |
| Failed | Rose pill (#e03131 on #fde0ec) | `{colors.card-tint-rose}` |
| Blocked | Peach pill (#dd5b00 on #ffe8d4) | `{colors.card-tint-peach}` |

**Running animation:** The badge background uses a subtle shimmer animation — a linear gradient that sweeps left-to-right over 2s, looping. Creates the "live shimmer" that Notion uses on active elements.

### Check Results

Checks are presented as an inline list below the task description, inside the expanded card body:

```
✓  RSS snapshot exists        (pass — mint, check icon)
✗  ≥10 articles               (fail — rose, cross icon)
○  Normalized JSON exists      (pending — gray, hollow circle)
```

- **Icon style**: 14px inline SVG. Pass: checkmark in `{colors.semantic-success}`. Fail: cross in `{colors.semantic-error}`. Pending: hollow circle in `{colors.muted}`.
- **Label**: `{typography.body-md}` (16px/400), `{colors.charcoal}` text.
- **Layout**: Stacked list, 8px gap between checks. Left border 2px in the status color (mint/rose/gray) for quick scanning.

### Inputs / Outputs

Rendered as labeled lists inside the expanded task body, below the checks:

- **Label**: `{typography.caption-bold}` (13px/600), `{colors.steel}` uppercase ("INPUTS" / "OUTPUTS"), 4px letter-spacing
- **Items**: `{typography.body-sm}` (14px/400), `{colors.charcoal}`, each item as a chip-like inline text span with a subtle `{colors.surface}` background and `{rounded.xs}` (4px) border-radius
- **Icon**: A small arrow-in (for inputs) and arrow-out (for outputs) inline SVG icon (12px, steel) preceding each list

### Duration & Attempts

Rendered in the card header row, to the right of the status badge:

- **Duration**: `{typography.micro}` (12px/500), `{colors.muted}`. Format: "439ms" or "56s". The `s` is slightly lighter than the number.
- **Attempts**: `{typography.micro}`, muted, prefixed with "×N". Only shown when attempts > 1.
- **Format**: `[status-badge] [duration] [attempts]` — horizontally aligned in the header right slot

### Depends On

Rendered inside the expanded card body, above the checks section:

- **Label**: "Depends on" in `{typography.caption}` (13px/400), steel color
- **Values**: Task ID chips, styled as inline links (`{colors.link-blue}`, `{typography.body-sm-medium}`). Clicking a chip scrolls to that task and highlights it for 1s with a subtle brand-purple border flash.
- **Separator**: Pipe characters between IDs

---

## 9. Interaction Design

### Clickable Areas

- **Task card header** (title + mode icon + status): Click to expand/collapse body. Hover: background lightens to `{colors.surface-soft}`, cursor pointer.
- **Status badge**: Non-clickable (read-only display)
- **Check items**: Non-clickable (read-only display)
- **Input/output chips**: Non-clickable
- **Depends-on chips**: Clickable — navigates to referenced task
- **Table of contents dots**: Clickable — scrolls to task
- **Child task area**: Click anywhere on child to expand it

### Hover States

- **Task card header hover**: Background → `{colors.surface-soft}` (#fafaf9), transition 150ms ease
- **Depends-on chip hover**: Text → `{colors.link-blue-pressed}` (#005bab), transition 100ms
- **TOC dot hover**: Scale 1.0 → 1.2, transition 100ms spring. Tooltip with task title appears after 400ms delay.
- **Child connector hover**: Left border color → `{colors.primary}` at 30% opacity

### Expand/Collapse

- **Animation**: Max-height transition, 200ms ease-out. Content fades in at 150ms.
- **Chevron**: Rotates 0° → 90° on expand (when collapsed, it points down-right; when expanded, it points straight down). Uses CSS transform, not SVG swap.
- **Indicator**: When a task has children, the chevron shows the count of children in a small micro badge beside it (e.g., "3" in muted text).

### Body Reveal

When a task is expanded, the body contains:

1. **Description** (if not already visible at the current depth level)
2. **Depends on** (only if non-empty)
3. **Inputs** list (only if non-empty)
4. **Outputs** list (only if non-empty)
5. **Checks** results (only if checks exist)
6. **Body text** (markdown rendered): `{typography.body-md}`, generous leading (1.55), max-width 720px for readability, charcoal text

Markdown rendering: headings become `{typography.heading-5}` style, code blocks use `{colors.surface}` background + `{rounded.sm}` border, inline code uses subtle steel styling, lists are properly spaced.

### Error State (Failed Task)

Failed tasks show their card with a `{colors.card-tint-rose}` tint background. The check results section shows which checks failed in red. A small inline error icon (red, 14px) appears beside the failed status badge.

### Running Shimmer

For tasks in "running" status, the card has a left border 3px wide in `{colors.primary}` with a CSS animation: a shimmer effect that sweeps left-to-right, creating a subtle glow that pulses every 2 seconds. Implemented with a `::before` pseudo-element using a linear gradient animation.

---

## 10. Signature Touches — The Notion Hand

### Touch 1: Sticky-Notes Table of Contents

The left sidebar shows the playbook's top-level structure as a vertical tree of colored dots on a dotted vertical connector line — reminiscent of Notion's sticky-note dots in the hero band. Each dot is colored by the task's status, creating an instant visual map of where the playbook stands. Click any dot to jump. Active task dot has a subtle pulse.

### Touch 2: Pastel Section Coloring

Each task mode uses a distinct pastel tint that echoes Notion's product: gateway = peach, spawner = lavender, leaf = white. But deeper nesting also uses tints — Level 3 children get a slight `{colors.surface-soft}` tint that makes them feel nested without breaking the clean canvas aesthetic.

### Touch 3: Ambient Running Shimmer

The running status badge and task card use a subtle CSS animation — a gradient that sweeps across the purple border, looping every 2s. This "live" signal is the ambient motion that Notion's brand is known for. Implemented in pure CSS, no JS required. It makes active work feel alive without being distracting.

### Touch 4: Paper Shadow System

Cards use Notion's elevation system:
- Level 0 gateway cards: `box-shadow: 0 1px 3px rgba(15, 15, 15, 0.08)` (very subtle, like a post-it note)
- Level 1–2 leaf cards: `box-shadow: 0 1px 2px rgba(15, 15, 15, 0.04)` (flatter, like a flat card on paper)
- No Level 3+ card shadows — deep tasks are flush with the surface

---

## 11. Component Inventory

### Task Card (Leaf)

```
States: pending / running / pass / failed / blocked
Size variants: Level 1 (large) / Level 2 (standard) / Level 3 (compact) / Level 4 (minimal)

Header row:
  [mode-icon] [title..............................] [status-badge] [duration]
Body (collapsed): empty
Body (expanded):
  [description — body-md, charcoal]
  [Depends on: task-01 | task-02]
  [Inputs: [chip] [chip]]
  [Outputs: [chip] [chip]]
  [Checks:
    ✓ check label  (mint)
    ✗ check label  (rose)
    ○ check label  (gray)]
  [Body markdown text]
```

### Task Card (Gateway)

```
States: no status (structural)
Header: full-width, no collapse (gateway is always expanded visually)
Title + page icon (navy)
Children rendered below, indented 24px
No expand/collapse chevron
```

### Task Card (Spawner)

```
States: pending / running / pass / failed
Header row: [mode-icon] [title] [dynamic-badge] [status-badge]
Body: placeholder text or child list
Expand: reveals generated children
```

### Mode Badge

- **Leaf**: Tool icon (steel) + "task" micro label (steel, uppercase, 11px, 1px letter-spacing)
- **Spawner**: Cascade icon (brand-purple) + "dynamic" badge (lavender tint, purple-800 text)
- **Gateway**: Page icon (brand-navy) + no label (structural, no badge)

### Status Badge (Pill)

```
Pending:   [○ Pending]         — steel on gray
Running:   [◌ Running]        — white on purple, shimmer
Pass:      [✓ Completed]      — green on mint
Failed:    [✗ Failed]         — red on rose
Blocked:   [⊗ Blocked]        — orange on peach
```

### Input/Output Chip

```
[→ feeds.json]
[← script.md]
```
- Icon: 12px SVG arrow (in: arrow-down-left, out: arrow-up-right)
- Text: body-sm-medium, charcoal
- Background: `{colors.surface}`, rounded-xs (4px), padding 2px 8px
- Border: 1px solid `{colors.hairline-soft}`

### Check Item

```
✓ RSS snapshot exists         — mint left border, green check
✗ ≥10 articles                 — rose left border, red cross
○ Normalized JSON exists        — gray left border, hollow circle
```

### Table of Contents Sidebar Item

```
●── 01-ingest       ← green dot (pass), muted connector line
●── 02-cluster      ← green dot (pass)
●── 03-script       ← gray dot (pending)
  ○─ 03a-child      ← smaller dot, indented
```

---

## 12. Responsive Behavior

### Breakpoints

| Name | Width | Changes |
|---|---|---|
| Desktop | ≥ 1024px | Full layout: sidebar (240px) + content (960px) + right gutter |
| Tablet | 768–1023px | Sidebar collapses to top sticky strip (horizontal scroll dots), content full-width |
| Mobile | < 768px | No sidebar. Tasks render full-width with 16px gutters. TOC becomes a top accordion. Nesting indentation reduced to 16px/level. |

### Mobile Adaptations

- **TOC**: Becomes a sticky top bar with horizontal scroll dots + task titles below
- **Task cards**: Stack fully, no side-by-side. Header row wraps gracefully.
- **Type scale**: hero heading 36px, heading-2 28px, heading-3 22px
- **Nesting**: 16px indent per level (vs 24px on desktop)
- **Expanded body**: Full-width, no max-width constraint (readability maintained via natural line length)
- **Touch targets**: All interactive elements minimum 44px tap area

---

## 13. Implementation Notes

### Typography

All Notion Sans tokens are exact references. No custom type families. Subset the font to characters actually used to keep load time low.

### CSS Architecture

- CSS custom properties for all design tokens (enables runtime theming)
- BEM naming convention for component classes: `.task-card`, `.task-card__header`, `.task-card__status-badge--pass`
- Flat CSS (no CSS-in-JS, no Tailwind) — single stylesheet for simplicity
- `prefers-reduced-motion` media query removes shimmer animations

### Animation

- Shimmer: CSS `@keyframes` with `background-position` on a linear gradient
- Expand/collapse: `max-height` transition with `overflow: hidden`
- Chevron rotation: CSS `transform: rotate()` on transition
- Hover transitions: 100–150ms ease

### Data Rendering

- Task tree rendered as nested `<ul>` / `<li>` with semantic HTML
- Markdown body rendered with a simple markdown parser (marked.js or equivalent)
- Status dots in TOC updated via JavaScript (Intersection Observer for active tracking)
- All interactive states handled via CSS + minimal vanilla JS

### Sample Data

Use the "AI News Data Pipeline" example from the product spec (01-ingest through 04-validate). Add a gateway wrapper (preparation / production) to demonstrate 3-level nesting.