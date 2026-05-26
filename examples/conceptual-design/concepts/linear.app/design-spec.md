---
version: alpha
name: living-playbook-linear
description: Creative design specification for the Living Playbook — a structured handbook-style task tree interface authored in Linear's dark software-craft design language.
---

# Living Playbook — Creative Design Specification
**Brand: Linear | Style: Dark Software Craft**

---

## 1. Brand Interpretation

Linear's soul is the near-absolute dark: a #010102 canvas so deep it appears pure black, against which light gray text (#f7f8f8) glows with quiet authority. It is the design language of tools that serious people use to do serious work — dense, technical, quietly luxurious. No decoration for decoration's sake. No atmospheric color. Every pixel earns its place.

For the Living Playbook, this translates into a **dark command center** — the feeling of opening Linear's issue view and understanding everything in front of you at once. Not a document to read slowly, but an interface to command. Tasks are not paragraphs — they are issues. Sections are not chapters — they are projects. The hierarchy is not literary — it is operational.

**The key Linear characteristics that drive this design:**

- **Near-pure black canvas** (#010102) — the deepest dark in any design system. All surfaces rest on this abyss.
- **Single chromatic accent** — lavender-blue (#5e6ad2) used scarcely: brand mark, focus rings, primary CTA, and the running status shimmer. Nothing else.
- **Surface ladder without shadows** — canvas → surface-1 → surface-2 → surface-3 → surface-4. Hierarchy through elevation, not drop shadows. 1px hairline borders separate each level.
- **Aggressive negative tracking** on display type (-3.0px at 80px, -1.8px at 56px) — Linear's type reads as compressed and confident, not airy.
- **Dense information, low noise** — the product screenshot cards on Linear's marketing page set the standard: maximum signal, minimal chrome. Every task card should feel like a well-designed issue row.
- **No second chromatic color** — semantic status uses hairline treatment and surface shifts, not green/red/orange fills. The only green is `{colors.semantic-success}` for pass states.
- **Linear Mono** for IDs, timestamps, and technical metadata — the monospace voice grounds the interface in precision.

**What this means for the Living Playbook:**
The handbook metaphor from the product spec becomes a Linear-style **execution dashboard** — dark, dense, scannable at a glance, drillable on demand. Five levels of nesting are expressed through the surface ladder and indentation, not pastel backgrounds. Status is communicated through surface shifts and hairline treatment, not saturated fills. The result feels like a Linear project view: software that respects the operator's intelligence.

---

## 2. Page Composition

### Overall Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  NAV BAR (56px) — Linear wordmark left, playbook title center,          │
│                   search pill + actions right                            │
│                   Background: {colors.canvas} (#010102)                  │
│                   Bottom: 1px {colors.hairline} border                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  HEADER PANEL (surface-1) — playbook name as display-md (40px),         │
│  description in ink-muted, stats row in mono (task count, duration)      │
│  Background: {colors.surface-1} (#0f1011)                              │
│  Border: 1px {colors.hairline} bottom                                   │
│  Status filter pills: pill tabs (all / pending / running / pass / fail) │
│                                                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  CONTENT AREA (canvas #010102)                                         │
│                                                                        │
│    ┌─────────────────────────────────────────────┐ 240px │              │
│    │ SIDE PANEL (surface-1)                     │        │              │
│    │ "Table of Contents" in eyebrow             │        │              │
│    │ Vertical connector tree, dot indicators    │        │              │
│    │ Click a node → scroll to task              │        │              │
│    │ Active tracking via Intersection Observer  │        │              │
│    └─────────────────────────────────────────────┘        │              │
│    ┌──────────────────────────────────────────────┐        │              │
│    │ TASK TREE (fluid, max 960px)                │        │              │
│    │                                              │        │              │
│    │  [task cards rendered on canvas]            │        │              │
│    │                                              │        │              │
│    └──────────────────────────────────────────────┘        │              │
│                                                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

**Reading flow:** The reader arrives at the dark nav bar (their Linear muscle memory). Below it, the surface-1 header panel is the orientation strip — playbook name, description, stats, filter pills. The content area is the dark canvas where tasks live as issues. The left side panel provides structural navigation without breaking the command-center feel. Scrolling is fast; tasks are dense but never cramped.

### Nav Bar

- Background: `{colors.canvas}` (#010102)
- Bottom: 1px border `{colors.hairline}` (#23252a)
- Height: 56px (matches `{components.top-nav}`)
- Left: Linear wordmark SVG in `{colors.ink}` (light gray #f7f8f8)
- Center: Playbook title in `{typography.body-sm-medium}`, `{colors.ink}` — a quiet label, not competing with the wordmark
- Right: Search pill (`search-pill` style: surface-1 bg, ink-subtle text) + action buttons
- Sticky on scroll with `backdrop-filter: blur(12px)` for depth over content

### Header Panel

- Background: `{colors.surface-1}` (#0f1011)
- Top padding: `{spacing.xl}` (32px); bottom: `{spacing.lg}` (24px)
- Left/right padding: `{spacing.xl}` (32px)
- Bottom border: 1px `{colors.hairline}` (#23252a)

**Playbook title:** `{typography.display-md}` (40px/600), `{colors.ink}`, letter-spacing -1.0px, line-height 1.15

**Description:** `{typography.body-lg}` (18px/400), `{colors.ink-muted}`, line-height 1.50

**Stats row:** Horizontal mono-labeled row:
- `Tasks: 4` · `Completed: 3` · `Duration: 57s`
- `{typography.mono}` (13px/400), `{colors.ink-subtle}` (#8a8f98)
- Separated by "·" in `{colors.hairline-tertiary}`

**Status filter pills:** Below stats row, a horizontal pill-tab row:
- `All` · `Pending` · `Running` · `Completed` · `Failed`
- Pill style matching `{components.pricing-tab-selected}`: surface-2 background for active, canvas for inactive
- Click filters the task tree to show only matching status tasks
- Uses `{rounded.pill}` (9999px), `{typography.button}`, 6px 14px padding

### Side Panel (Table of Contents)

- Width: 240px, sticky at top with nav bar height offset
- Background: `{colors.surface-1}` (#0f1011)
- Right border: 1px `{colors.hairline}` (#23252a)
- Top padding: `{spacing.lg}` (24px); bottom: `{spacing.lg}` (24px)

**"Contents" label:** `{typography.eyebrow}` (13px/500, +0.4px tracking), `{colors.ink-subtle}`, uppercase, "Contents"

**Tree structure:**
- Vertical connector: 1px line in `{colors.hairline-tertiary}` (#3e3e44)
- Dots: 8px diameter circles at each top-level task, colored by status
- Active dot: 8px + 2px ring in `{colors.primary}` (#5e6ad2) (Linear's focus ring treatment)
- Hover: scale 1.0 → 1.15, 100ms ease
- Hover tooltip: task title in `{typography.body-sm}`, surface-2 bg, 200ms delay

**Tree nodes:**
```
●─ preparation      ← status-colored dot, eyebrow label in ink-subtle
●─ production       ← second top-level section
    ○─ 03-script    ← indented child, smaller 6px dot, ink-tertiary
    ○─ 04-validate
```

### Content Area

- Background: `{colors.canvas}` (#010102)
- Max-width: 960px, centered
- Top padding: `{spacing.xxl}` (48px)
- Bottom padding: `{spacing.section}` (96px)
- Left padding: `{spacing.xl}` (32px) for tree connector alignment

---

## 3. Typography Scale

**Font families:** Linear Display for headings, Linear Text for body, Linear Mono for metadata and IDs. Fallback: SF Pro Display / SF Pro Text / SF Mono on macOS; Inter 500/600/400 for cross-platform.

All Linear typography tokens are reused exactly:

| Token | Size/Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|
| `{typography.display-xl}` | 80px / 600 | 1.05 | -3.0px | Not used (too large for handbook) |
| `{typography.display-lg}` | 56px / 600 | 1.10 | -1.8px | Not used |
| `{typography.display-md}` | 40px / 600 | 1.15 | -1.0px | Playbook title in header panel |
| `{typography.headline}` | 28px / 600 | 1.20 | -0.6px | Level 0 gateway task titles |
| `{typography.card-title}` | 22px / 500 | 1.25 | -0.4px | Level 1 task titles |
| `{typography.subhead}` | 20px / 400 | 1.40 | -0.2px | Level 2 task titles |
| `{typography.body-lg}` | 18px / 400 | 1.50 | -0.1px | Task descriptions |
| `{typography.body}` | 16px / 400 | 1.50 | -0.05px | Task body markdown |
| `{typography.body-sm}` | 14px / 400 | 1.50 | 0 | Children task titles, check labels |
| `{typography.caption}` | 12px / 400 | 1.40 | 0 | Status labels, fine print |
| `{typography.eyebrow}` | 13px / 500 | 1.30 | 0.4px | Section eyebrows, "INPUTS" labels |
| `{typography.mono}` | 13px / 400 | 1.50 | 0 | Task IDs, timestamps, durations |

**Key principle:** Negative tracking on display sizes creates compact, confident headings. Mono for all metadata reinforces the technical execution feel.

---

## 4. Color Mapping

### Brand Colors (Semantic Roles)

| Role | Token | Hex | Use |
|---|---|---|---|
| Page canvas | `{colors.canvas}` | #010102 | Content area background, nav bar |
| Primary / active accent | `{colors.primary}` | #5e6ad2 | Focus rings, running status shimmer, active nav dot ring |
| Primary hover | `{colors.primary-hover}` | #828fff | Hover states on primary elements |
| Primary focus | `{colors.primary-focus}` | #5e69d1 | Focus ring outlines |
| Surface lift 1 | `{colors.surface-1}` | #0f1011 | Header panel, side panel, task cards |
| Surface lift 2 | `{colors.surface-2}` | #141516 | Expanded cards, active filter pills |
| Surface lift 3 | `{colors.surface-3}` | #18191a | Nested deep tasks, sub-panels |
| Surface lift 4 | `{colors.surface-4}` | #191a1b | Deepest nested elements |
| Border light | `{colors.hairline}` | #23252a | Card borders, dividers |
| Border strong | `{colors.hairline-strong}` | #34343a | Focus rings, strong borders |
| Border tertiary | `{colors.hairline-tertiary}` | #3e3e44 | Tree connector lines, subtle dividers |
| Text primary | `{colors.ink}` | #f7f8f8 | Headlines, task titles, primary body |
| Text secondary | `{colors.ink-muted}` | #d0d6e0 | Descriptions, subtitles |
| Text tertiary | `{colors.ink-subtle}` | #8a8f98 | Labels, eyebrows, inactive elements |
| Text disabled | `{colors.ink-tertiary}` | #62666d | Disabled, footnotes |
| Success | `{colors.semantic-success}` | #27a644 | Pass status badge only |

### Status Colors (The Linear Approach — Surface-Based, Not Fill-Based)

Linear doesn't use saturated status fills. Instead, status is communicated through **surface treatment + hairline + text weight**:

| Status | Treatment | Text | Border | Background |
|---|---|---|---|---|
| Pending | No accent | `{colors.ink-subtle}` | `{colors.hairline}` | `{colors.surface-1}` |
| Running | Lavender shimmer on left border | `{colors.ink}` | `{colors.primary}` 2px left | `{colors.surface-1}` |
| Pass | Semantic green badge | `{colors.ink}` | `{colors.hairline}` | `{colors.surface-1}` |
| Failed | Subtle surface-3 background | `{colors.ink-muted}` | `{colors.hairline}` | `{colors.surface-3}` |
| Blocked | Surface-2 background, muted text | `{colors.ink-subtle}` | `{colors.hairline}` | `{colors.surface-2}` |

**Pass badge:** Uses `{colors.semantic-success}` (#27a644) as a small 6px dot indicator + text label "Pass" in `{typography.caption}`, `{colors.semantic-success}` color. This is the only saturated color on task cards — a single accent that rewards completion.

**Running shimmer:** A CSS animation on the task card's left border. Border is 2px `{colors.primary}` with a sweeping gradient animation (transparent → primary-hover → transparent) over 2s, looping. This is the ambient "live" signal — Linear's focus ring energy applied to the card edge.

### Task Mode Colors

| Mode | Treatment | Icon Color | Accent |
|---|---|---|---|
| Gateway | Surface-1, section header treatment, no status | `{colors.ink-subtle}` | Left border 2px `{colors.primary}` |
| Spawner | Surface-1, "dynamic" treatment with shimmer border | `{colors.primary}` | Animated lavender shimmer |
| Leaf | Surface-1, standard task row | `{colors.ink-subtle}` | 1px hairline border |

---

## 5. Spacing System

**Base unit: 4px** (Linear's standard)

| Token | Value | Use |
|---|---|---|
| `{spacing.xxs}` | 4px | Icon-to-text gap, dot diameter |
| `{spacing.xs}` | 8px | Badge padding, compact grouping |
| `{spacing.sm}` | 12px | Tag padding, compact lists |
| `{spacing.md}` | 16px | Body paragraph spacing |
| `{spacing.lg}` | 24px | Card padding, task card gaps |
| `{spacing.xl}` | 32px | Section padding, header panel padding |
| `{spacing.xxl}` | 48px | Large gaps, content top padding |
| `{spacing.section}` | 96px | Major section spacing |

### Nesting Indentation

Each level of depth indents by the surface ladder progression (24px per level):

| Level | Indent | Card Surface | Border | Type Scale |
|---|---|---|---|---|
| Level 0 (gateway) | 0px | `{colors.surface-1}` | 0px (structural header) | `{typography.headline}` 28px |
| Level 1 | 24px | `{colors.surface-1}` | 1px `{colors.hairline}` | `{typography.card-title}` 22px |
| Level 2 | 48px | `{colors.surface-1}` | 1px `{colors.hairline}` | `{typography.subhead}` 20px |
| Level 3 | 72px | `{colors.surface-2}` | 1px `{colors.hairline}` | `{typography.body-lg}` 18px bold |
| Level 4 | 96px | `{colors.surface-3}` | 1px `{colors.hairline-tertiary}` | `{typography.body-sm}` 14px |

**Progressive depth reduction:** Deeper levels move down the surface ladder, reducing visual weight. Level 0 gateways are structural and prominent. Level 4 subtasks are embedded and minimal — the surface shift communicates depth without needing color fills.

---

## 6. Nesting Expression — The Core Design Challenge

Five levels of depth must feel like a Linear project view — dense, scannable, and quietly layered. The solution is the **surface ladder as depth signal** + **hairline borders as structure** + **indentation as tree** + **mono IDs as precision markers**.

### Visual Rhythm by Level

```
Level 0 (Gateway/Section Header):
  - Background: surface-1 (#0f1011)
  - Title: {typography.headline} (28px/600), ink, -0.6px tracking
  - Left accent bar: 2px wide, {colors.primary} (#5e6ad2)
  - No card border — it's a section divider, not a task
  - Mono section label above: "01 / PREPARATION" in {typography.mono} (13px),
    ink-subtle, +0.4px tracking (the eyebrow treatment)
  → Large, structural, commanding. The section opener.

Level 1 (Primary Task):
  - Background: surface-1
  - Border: 1px {colors.hairline}
  - Title: {typography.card-title} (22px/500), ink, -0.4px tracking
  - Mono ID badge left: "01" in surface-2, mono, ink-subtle, rounded-xs
  - 24px left indent
  → Standard task row — Linear's issue-list feel

Level 2 (Secondary Task):
  - Background: surface-1
  - Border: 1px {colors.hairline}
  - Title: {typography.subhead} (20px/400), ink, -0.2px tracking
  - Mono ID: "01-a" in rounded-xs surface-2 pill
  - 48px left indent
  → Distinct sub-task, clearly subordinate

Level 3 (Subtask):
  - Background: surface-2 (#141516) — lift up one surface
  - Border: 1px {colors.hairline}
  - Title: {typography.body-lg} bold (18px/500), ink
  - 72px left indent
  → Subtask — visually "lifted out" from the flat surface

Level 4 (Fine-grained):
  - Background: surface-3 (#18191a)
  - Border: 1px {colors.hairline-tertiary} (subtle)
  - Title: {typography.body-sm} (14px/400), ink-subtle
  - 96px left indent
  → Minimal, embedded, clearly lowest in the tree
```

### Connector Lines

A vertical hairline-tertiary line (1px, #3e3e44) runs at the left edge of each task block — at the indent position of that level. Child tasks connect to their parent via a horizontal hairline line extending from the parent's connector down. This is the Linear equivalent of the issue list's grouping lines — technical, precise, not decorative.

**Hover:** Both the horizontal and vertical connector lines brighten to `{colors.primary}` at 40% opacity. The parent task card gets a faint primary ring.

### Collapse/Expand

- **Chevron icon:** 16px, `{colors.ink-tertiary}`, rotates 0° → 90° on expand. CSS `transform`, no SVG swap.
- **Animation:** `max-height` transition, 180ms ease-out. Content fades in at 120ms.
- **Progressive disclosure:** Level 2+ children collapsed by default. Click the task header row to expand.
- **Click target:** The entire task card header row — title, ID badge, status, chevron — is clickable.

### Tree Structure in Linear Style

```
01 / PREPARATION                    ← Level 0: eyebrow mono + headline, lavender left bar
   │
   ├── [01] 01-ingest               ← Level 1: mono ID badge + card-title, hairline border
   │      ✓ Pass · 439ms
   │
   └── [02] 02-cluster              ← Level 2: "02" mono badge + subhead, hairline
           ✓ Pass · 573ms
           └── [02-a] child-task    ← Level 3: surface-2 bg, body-lg bold, hairline
                   ◌ Running · —
```

The vertical/horizontal connector lines use hairline-tertiary (#3e3e44), 1px. At each node, a small 6px dot in the status color sits on the vertical line.

---

## 7. Task Type Differentiation

### Gateway (Container/Section)

**Visual treatment:** A section header that is NOT a task card — it's a structural divider. No status. No expand/collapse. No hairline border on the outside. Instead:

- Background: `{colors.surface-1}` (#0f1011) full-width strip
- Mono section label above the title: "01 / PREPARATION" in `{typography.mono}`, ink-subtle, +0.4px tracking
- Title: `{typography.headline}` (28px/600), ink, -0.6px tracking
- Left accent: 2px vertical bar in `{colors.primary}` (lavender) — the only color on the header
- No border, no card treatment — it reads as a chapter divider, not a task
- A subtle 1px bottom border in `{colors.hairline}` separates it from the next content

**Signature:** The mono section label in eyebrow style ("01 / PREPARATION") signals that this is organizational, not executable.

### Spawner (Dynamic Factory)

**Visual treatment:** A surface-1 card with a dynamic treatment — a left border 2px in `{colors.primary}` with an animated shimmer. The shimmer sweeps left-to-right, looping every 2s. This is the ambient "generating children" signal.

- **Mono dynamic badge:** "Dynamic" in `{typography.mono}` (13px), surface-2 background, `{colors.primary}` text, rounded-xs. Sits beside the task ID badge.
- **Children:** Render below the spawner card with standard indentation. When no children exist (runtime pending), a dashed-border placeholder: "Awaiting runtime children..." in `{typography.body-sm}`, ink-subtle, italic. The dashed border uses 2px dashed `{colors.hairline-tertiary}`.

### Leaf (Worker)

**Visual treatment:** Standard Linear issue-row card. Surface-1 background, 1px hairline border, compact header row.

- **Mono ID badge:** Small 6px dot in mono font (e.g., "01") in a rounded-xs pill: surface-2 background, ink-subtle text. Sits at the left of the title. This is Linear's ID convention.
- **Status badge:** For pass status only: a small green dot (6px) + "Pass" label in `{typography.caption}`, `#27a644`. For other statuses, the surface treatment communicates state.
- **Running shimmer:** Left border 2px `{colors.primary}` with animated gradient sweep.
- **Body:** Expands on click, showing description, inputs, outputs, checks, body markdown.

---

## 8. Status & Data Presentation

### Status Presentation (Linear Style — Surface-Based)

Linear doesn't use colored fills for status. Instead, status is communicated through:

1. **The card's surface level** — pass: surface-1 with green badge; failed: surface-3 (darker); running: surface-1 with shimmer; blocked: surface-2.
2. **A minimal text label** for non-pass states.
3. **Hairline treatment** — failed cards have no special border, the surface shift is enough.
4. **The pass badge** is the only saturated color element: 6px green dot + green text label.

| Status | Badge Style | Card Treatment |
|---|---|---|
| Pending | Text label in `{colors.ink-subtle}`, `{typography.caption}` | Surface-1, hairline border |
| Running | Text label in `{colors.ink}`, `{typography.caption}` + animated shimmer | Surface-1, lavender left border shimmer |
| Pass | Green dot (6px) + "Pass" in `{colors.semantic-success}` | Surface-1, hairline border |
| Failed | Text label in `{colors.ink-muted}`, `{typography.caption}` | Surface-3 (darker), hairline border |
| Blocked | Text label in `{colors.ink-subtle}`, `{typography.caption}`, italic | Surface-2, hairline border |

**Running animation:** The card's left border is 2px `{colors.primary}` with a CSS `@keyframes` shimmer — a linear gradient that sweeps from left to right, cycling every 2s. The gradient: `linear-gradient(90deg, transparent 0%, #828fff 50%, transparent 100%)` at 20% opacity, animating `background-position` from -100% to 200%.

### Check Results

Checks rendered as a compact inline list, inside the expanded card body:

```
✓  RSS snapshot exists
✗  ≥10 articles
○  Normalized JSON exists
```

- **Pass check:** 14px checkmark SVG in `{colors.semantic-success}` (#27a644), `{typography.body-sm}` label in `{colors.ink}`
- **Fail check:** 14px cross SVG in `{colors.ink-muted}`, label in `{colors.ink-muted}`
- **Pending check:** 14px hollow circle SVG in `{colors.hairline-tertiary}`, label in `{colors.ink-subtle}`
- **Layout:** Stacked list, 8px gap. No left border — Linear doesn't use color borders for checks.
- The check results section has a top border 1px `{colors.hairline}` for separation.

### Inputs / Outputs

Rendered as mono-labeled lists inside the expanded card body, below the description:

- **Label:** `{typography.eyebrow}` (13px/500, +0.4px tracking), uppercase, `{colors.ink-subtle}`. "INPUTS" / "OUTPUTS"
- **Items:** `{typography.mono}` (13px/400), `{colors.ink-muted}`. Each item in a surface-2 rounded-xs pill: surface-2 background, hairline border, ink-muted text. Items separated by 8px.
- No arrow icons — Linear avoids decorative icons in favor of clean typographic lists.

### Duration & Attempts

Rendered in the card header row, right-aligned:

- **Duration:** `{typography.mono}` (13px/400), `{colors.ink-subtle}`. Format: "439ms" or "56s"
- **Attempts:** `{typography.mono}`, `{colors.ink-tertiary}`, prefixed "×2". Only shown when attempts > 1.
- Format: `[status] · [duration] · [attempts]` — all in mono, separated by "·"

### Depends On

Rendered inside the expanded card body, above the checks section:

- **Label:** "Depends on" in `{typography.caption}` (12px/400), `{colors.ink-subtle}`
- **Values:** Task ID chips in `{typography.mono}` (13px/400), surface-2 rounded-xs. `{colors.primary}` text for the ID. Separated by " · "
- **Interaction:** Click a depends-on chip → scrolls to that task and briefly highlights it with a 2px lavender focus ring (1s, then fades)

---

## 9. Interaction Design

### Clickable Areas

- **Task card header** (ID badge + title + status + duration + chevron): Click to expand/collapse body. Hover: background shifts to surface-2, cursor pointer.
- **Status badge / check items / input chips**: Non-clickable (read-only display)
- **Depends-on chips**: Clickable — navigates to referenced task
- **TOC dots**: Clickable — scrolls to task
- **Filter pills**: Clickable — filters the task tree by status

### Hover States

- **Task card hover:** Background → `{colors.surface-2}` (#141516), transition 100ms ease
- **Depends-on chip hover:** Text color → `{colors.primary}` (#5e6ad2), 100ms
- **TOC dot hover:** Scale 1.0 → 1.15, transition 100ms. Tooltip with task title after 300ms delay.
- **Connector lines hover:** Color → `{colors.primary}` at 40% opacity, 100ms
- **Filter pill hover:** Background → `{colors.surface-1}`, text → `{colors.ink}`, 100ms

### Expand/Collapse

- **Animation:** `max-height` transition, 180ms ease-out. Content fades in at 120ms via `opacity: 0 → 1`.
- **Chevron:** Rotates 0° → 90° using CSS `transform`. Smooth 180ms transition.
- **Child count:** A mono badge beside the chevron shows the number of children: "3" in `{typography.mono}`, surface-3 background, ink-tertiary text, rounded-xs.

### Body Reveal

When expanded, the card body contains (in order):

1. **Description** — `{typography.body-lg}` (18px/400), `{colors.ink-muted}`, line-height 1.50
2. **Depends on** — task ID chips, only if non-empty
3. **Inputs** list — mono-labeled, surface-2 chip pills, only if non-empty
4. **Outputs** list — same treatment
5. **Checks** results — stacked check items with icon + label
6. **Body markdown** — `{typography.body}` (16px/400), ink, line-height 1.50, max-width 720px

**Markdown rendering:** H3 headings become `{typography.body-lg}` bold. H4 headings become `{typography.body-sm-medium}`. Code blocks use surface-2 background + rounded-sm border. Inline code uses ink-subtle text on surface-3 background. Lists get proper 8px vertical spacing. Links are `{colors.primary}`.

### Failed Task State

Failed tasks use surface-3 background (#18191a) — the card appears darker than passing tasks, which Linear's surface ladder naturally supports. The check results section shows failing checks with `{colors.ink-muted}` text and cross icons. No red fill — the surface shift is the signal.

### Running Shimmer

For running tasks, the card has a left border 2px in `{colors.primary}` with a CSS animation — a linear gradient that sweeps across the border, cycling every 2s. The animation uses `background-position` on a gradient pseudo-element that is clipped to the left border. This is the ambient "live" signal that Linear's product uses on active elements.

---

## 10. Signature Touches — The Linear Hand

### Touch 1: The Mono ID Badge

Every task carries a mono ID badge — a small pill with the task number ("01", "02", "02-a") in Linear Mono. This is Linear's signature: precise, technical, instantly scannable. The ID badge sits at the left of the task title and is the primary way to reference and navigate between tasks. It's also the natural click target for depends-on navigation.

### Touch 2: Surface Ladder as Depth Signal

Rather than using pastel backgrounds or bold borders to distinguish nesting levels, the design uses Linear's own surface ladder: surface-1 for top-level tasks, surface-2 for expanded/nested content, surface-3 for deep subtasks. The hierarchy is communicated through elevation — the way Linear communicates priority and grouping in its own UI. This makes the Living Playbook feel like it belongs in Linear's ecosystem.

### Touch 3: The Running Shimmer

The lavender shimmer on running tasks is the ambient motion that Linear's design system reserves for active states. A gradient sweeps across the left border of a running task card — subtle, sophisticated, and distinctly Linear. It communicates "this is live" without using animation or bright colors. Implemented in pure CSS, it respects `prefers-reduced-motion`.

### Touch 4: Filter Pills

The status filter pills in the header panel (All / Pending / Running / Pass / Failed) are the Linear equivalent of a project view filter. They use pill-toggle styling — canvas background for inactive, surface-2 for active. Clicking a filter instantly shows/hides matching tasks with a subtle `opacity` transition (150ms). This is how Linear's own project view filters work: fast, spatial, reversible.

### Touch 5: Hairline Connector Lines

The tree structure is expressed through hairline-tertiary (#3e3e44) vertical and horizontal connector lines — 1px, precise, not decorative. At each node, a status-colored dot sits on the vertical line. The connectors use the same hairline treatment as Linear's own issue grouping lines: technical precision, not decorative flourishes. Hover brightens the relevant connector segment in lavender.

---

## 11. Component Inventory

### Task Card (Leaf)

```
States: pending / running / pass / failed / blocked
Size variants: Level 0 (gateway header) / Level 1 (card-title) / Level 2 (subhead) /
               Level 3 (surface-2 body-lg bold) / Level 4 (surface-3 body-sm)

Header row:
  [mono-ID-badge] [title...................................] [status] [duration] [chevron]
Body (collapsed): empty
Body (expanded):
  [description — body-lg, ink-muted]
  [Depends on: [chip] · [chip]]
  [INPUTS: [pill] [pill]]
  [OUTPUTS: [pill] [pill]]
  [Checks:
    ✓ check label
    ✗ check label
    ○ check label]
  [Body markdown]
```

### Task Card (Gateway)

```
Structural header, no status
Mono section label above title: "01 / PREPARATION"
Title: headline (28px), ink, -0.6px tracking
Left accent bar: 2px primary
Bottom border: 1px hairline
Children rendered below, standard indentation
```

### Task Card (Spawner)

```
Header row: [mono-ID-badge] [title] [dynamic-badge] [status-badge] [duration] [chevron]
Dynamic badge: "Dynamic" in mono, surface-2 bg, primary text, rounded-xs
Running shimmer: left border 2px primary animated gradient
Body: dashed-placeholder "Awaiting runtime children..." or child list
```

### Mono ID Badge

```
[01]     ← surface-2 bg, ink-subtle mono, rounded-xs, 4px 8px padding
[02-a]   ← same treatment for sub-task IDs
```

### Pass Badge

```
● Pass  ← 6px green dot + "Pass" in semantic-success color, mono caption
```

### Status Label (Non-Pass)

```
Running  ← mono caption, ink color
Failed   ← mono caption, ink-muted
Blocked  ← mono caption, italic, ink-subtle
Pending  ← mono caption, ink-subtle
```

### Input/Output Chip

```
01-ingest        ← surface-2 bg, hairline border, mono text (13px), rounded-xs
feeds-snapshot.xml
```

### Check Item

```
✓ RSS snapshot exists       ← green check SVG (14px) + body-sm label, ink
✗ ≥10 articles              ← ink-muted cross SVG + body-sm label, ink-muted
○ Normalized JSON exists    ← hairline-tertiary hollow circle + body-sm label, ink-subtle
```

### TOC Sidebar Item

```
●─ preparation       ← 8px status dot on hairline-tertiary vertical line, eyebrow label
●─ production        ← second top-level node
    ○─ 03-script     ← 6px smaller dot, indented, ink-tertiary label
    ○─ 04-validate
```

### Status Filter Pills

```
[All]  [Pending]  [Running]  [Completed]  [Failed]
         ↑ active = surface-2 bg, ink text
inactive = canvas bg, ink-subtle text, rounded-pill
```

---

## 12. Responsive Behavior

### Breakpoints

| Name | Width | Changes |
|---|---|---|
| Desktop-XL | 1440px+ | Full layout: 240px sidebar + 960px content + gutters |
| Desktop | 1280px | Full layout maintained |
| Tablet | 768–1023px | Side panel collapses to horizontal sticky strip at top; content full-width |
| Mobile | < 768px | No side panel. Tasks full-width with 16px gutters. Filter pills scroll horizontally. Indentation reduced to 16px per level. Type scale down: display-md → 28px, headline → 22px. |

### Mobile Adaptations

- **TOC**: Becomes a sticky top strip with horizontal scroll dots + mono section labels below
- **Task cards**: Stack fully. Header row wraps gracefully (ID badge above title on narrow).
- **Type scale**: display-md 40px → 28px; headline 28px → 22px; card-title 22px → 18px
- **Nesting**: 16px indent per level (vs 24px on desktop)
- **Expanded body**: Full-width, no max-width constraint
- **Touch targets**: All interactive elements minimum 44px tap area
- **Hairline borders**: Remain 1px at all sizes — Linear's borders are already minimal

---

## 13. Implementation Notes

### Typography

Linear Display, Linear Text, and Linear Mono are proprietary. Recommended substitutes:
- **Display / headings**: Inter 500/600 with matching negative letter-spacing
- **Body**: Inter 400 with matching letter-spacing
- **Mono (IDs, durations, timestamps)**: JetBrains Mono 400 or Geist Mono 400

### CSS Architecture

- CSS custom properties for all design tokens (enables runtime theming)
- BEM naming convention: `.task-card`, `.task-card__header`, `.task-card__status-badge--pass`
- Single flat stylesheet — no CSS-in-JS, no Tailwind
- `prefers-reduced-motion` media query removes shimmer animations and collapse transitions

### Animation

- **Shimmer:** CSS `@keyframes` with `background-position` on a `::before` pseudo-element clipped to the left border
- **Expand/collapse:** `max-height` transition with `overflow: hidden` + `opacity` fade
- **Chevron rotation:** CSS `transform: rotate()` with 180ms ease transition
- **Hover transitions:** 100ms ease

### Data Rendering

- Task tree rendered as nested `<div>` structure with `role="tree"` / `role="treeitem"` ARIA semantics
- Markdown body rendered with a simple parser (marked.js or equivalent)
- Status filter implemented via JavaScript class toggle on task cards
- Intersection Observer for TOC active tracking and scroll-spy
- All interactive states handled via CSS + minimal vanilla JS

### Sample Data

Use the "AI News Data Pipeline" example from the product spec, with a gateway wrapper (preparation / production) to demonstrate 3-level nesting. Include tasks with varied statuses (pass, running, pending, failed) to exercise the full status system.