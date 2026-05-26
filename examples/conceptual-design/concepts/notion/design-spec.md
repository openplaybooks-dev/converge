# Design Specification — Notion Living Handbook

## 1. Brand Interpretation

**How I read Notion's soul:** Notion is a confident, colorful organizer. Its personality is sophisticated productivity — it takes the chaos of "all your work in one place" and makes it feel calm and intentional. The homepage is a statement: a deep navy hero with scattered sticky-note dots and mesh wire illustrations, a signature purple pill CTA, and a bold yellow feature banner. The palette is dense and colorful — peach, rose, mint, lavender, sky, cream — because the live product uses colorful database property pills. The typography is Notion Sans (Inter-based), humanist-geometric, warm, and readable at every size. The geometry is sober-editorial: 8px-rounded buttons, 12px-rounded cards. Nothing is pill-shaped unless it's a badge or tab.

**How I translate this into a handbook:** The challenge is mapping Notion's confident color density into a warm-white book layout. The answer is not to remove color — it's to make color *signal*, not *fill*. Notion's dense pastel palette becomes the vocabulary for nesting depth and status. The charcoal `#37352f` is the book's ink. The signature purple `#5645d4` appears only where it earns its place: the active hover, the focused task, the one accent that draws the eye. Everything else is warm white paper and generous air.

The resulting handbook feels like something Notion's own design team made: confident, warm, colorful in its details, structurally serious in its composition.

---

## 2. Page Composition

**Reading flow — top-to-bottom, one column, like a Notion page**

The playbook is a single centered column, max-width 680px. No sidebar. No multi-column grid. Just content flowing down the page the way you scroll through a well-written reference book or a Notion document.

```
[Playbook Title — large chapter opener, charcoal]
[Playbook description — subtitle weight, slate]

  ┌──────────────────────────────────────────┐  ← Gateway (section)
  │  Chapter title (H3)                      │
  │  [mode badge] [status badge] [duration]   │
  │                                          │
  │  ┌────────────────────────────────────┐  │  ← Level 1 task
  │  │ Task title (body-md-medium)         │  │    indigo left border
  │  │ [description in slate]              │  │
  │  │ [checks row] [io pills]             │  │
  │  │                                     │  │
  │  │   ┌────────────────────────────┐   │  │  ← Level 2 task
  │  │   │ Subtask title               │   │  │    purple left border
  │  │   │ ...                         │   │  │
  │  │   └────────────────────────────┘   │  │
  └──────────────────────────────────────────┘
```

**Progressive disclosure:** Task bodies (long markdown instructions) are collapsed by default. Clicking a task title expands the body inline with a smooth height animation. The reader controls the depth — they skim headers and expand what interests them.

**Content zones:**

- **Top zone:** Playbook name (chapter-opener scale) + description. Breathing room above and below. Sets the tone.
- **Section zone:** Gateway tasks act as section dividers — they are full-width bands with the chapter title prominent. They are structural, not data-heavy.
- **Task zone:** Individual task cards live inside gateways or nested within other tasks. Each card is a self-contained unit.
- **Metadata zone:** Within each card, checks and I/O appear as compact inline pills and rows — present but not dominant.

**Horizontal padding:** 24px on mobile, 32px on tablet, auto-centered with equal margins on desktop.

---

## 3. Typography Scale

**Font family:** Notion Sans. Fallback: `'Notion Sans', 'Inter', -apple-system, system-ui, 'Segoe UI', sans-serif`. Never substitute a generic Inter — the slight Notion-specific weight distribution is part of the brand.

| Role | Token | Size | Weight | Line Height | Color | Use |
|---|---|---|---|---|---|---|
| Playbook title | `heading-1` | 36px | 600 | 1.15 | `#37352f` | Page-level opener |
| Playbook description | `subtitle` | 16px | 400 | 1.55 | `#5d5b54` | Subtitle |
| Gateway title | `heading-3` | 22px | 600 | 1.25 | `#37352f` | Chapter / section heading |
| Task title | `body-md-medium` | 16px | 500 | 1.50 | `#1a1a1a` | Task name |
| Task description | `body-sm` | 14px | 400 | 1.50 | `#5d5b54` | Brief explanation |
| Check label | `caption` | 13px | 400 | 1.40 | `#5d5b54` | Check description |
| Badge label | `micro-uppercase` | 11px | 600 | 1.40 | (from badge) | Status, mode, duration |
| I/O label | `caption-bold` | 13px | 600 | 1.40 | `#787671` | "Inputs:", "Outputs:" |
| I/O value | `body-sm` | 14px | 400 | 1.40 | `#37352f` | File/artifact name |
| Task body | `body-md` | 16px | 400 | 1.65 | `#1a1a1a` | Expanded markdown content |

**Notes:**
- `heading-1` at 36px for the playbook title — slightly scaled down from the brand's 48px since there's no hero context.
- Body line-height at 1.65 for the task body — generous for long-form markdown readability.
- Gateway titles use `heading-3` (22px, 600) — the natural Notion heading for a section block.
- No negative letter-spacing on handbook headings — the intimate book context doesn't call for the dramatic hero treatment.

---

## 4. Color Mapping

**Background:** `#fafaf9` (warm white — Notion's `{surface-soft}`) for the page. This is the "paper."

**Card surface:** `#ffffff` (Notion's `{canvas}`) for every card. White on warm white — the paper-on-paper effect.

**Text hierarchy:**

| Role | Color | Hex | Notion Token |
|---|---|---|---|
| Deep headings | Charcoal | `#37352f` | `{charcoal}` |
| Primary text | Near-black | `#1a1a1a` | `{ink}` |
| Secondary text | Slate | `#5d5b54` | `{slate}` |
| Tertiary / metadata | Stone | `#787671` | `{steel}` |
| Muted / placeholder | Muted | `#bbb8b1` | `{muted}` |

**Status badges — using Notion's pastel card-tint palette:**

| Status | Background | Text | Badge Token Used |
|---|---|---|---|
| Pass | `#d9f3e1` mint | `#1aae39` green | `badge-tag-green` |
| Running | `#fef7d6` yellow | `#a07d20` amber | Custom amber pill |
| Failed | `#fde0ec` rose | `#c0285a` red | Custom rose pill |
| Pending | `#f0eeec` gray | `#787671` steel | `badge-tag` gray |
| Blocked | `#f8f5e8` cream | `#5d5b54` slate | Custom cream pill |

**Mode badges — pastel tints for the three task types:**

| Mode | Background | Text | Treatment |
|---|---|---|---|
| Gateway | `#e6e0f5` lavender | `#391c57` deep purple | `badge-tag-purple` |
| Spawner | `#dcecfa` sky | `#0075de` link blue | `badge-tag-sky` (custom) |
| Leaf | `#f0eeec` gray | `#5d5b54` slate | `badge-tag` gray |

**Depth borders — Notion's pastel palette expresses nesting level:**

| Level | Left border color | Pastel tint |
|---|---|---|
| 0 (gateway/section) | `#5645d4` purple | Gateway background `#e6e0f5` |
| 1 | `#5645d4` purple | — |
| 2 | `#793400` orange-deep | — |
| 3 | `#a02e6d` pink-deep | — |
| 4 | `#2a9d99` teal | — |

Border width: `3px solid` at level 0, `2px solid` at levels 1–4.

**Accent:** Notion Purple `#5645d4` — used only for the active/focused task's border (switches from depth color to purple on hover/focus), and the active state on interactive elements. Never used as a large background block.

**Hairline separators:** `1px solid #ede9e4` (Notion's `{hairline-soft}`) for subtle dividers within cards.

---

## 5. Spacing System

**Base unit:** 4px. **Primary increment:** 8px.

**Card internal padding:**
- Gateway headers: `20px 24px` — compact but breathable
- Task cards: `16px 20px` — standard Notion card padding
- Check rows: `8px 0` — tight, data-dense

**Card gaps:**
- Between sibling tasks: `12px` — tight enough to read as related, loose enough to breathe
- Between task and its children: `12px`
- Within a task, between metadata rows: `10px`

**Section gaps:**
- Between gateway sections: `40px` — significant breathing room marks the chapter break
- Above playbook title: `64px` — the hero-space that opens the page
- Below playbook title: `24px`

**Body text:** max-width 620px inside task body — keeps long markdown readable without eye-travel.

**Badge padding:** `2px 8px` for mode badges, `3px 8px` for status badges — small, never dominant.

**I/O pills:** `4px 10px` with `2px` gap between pills — compact list of file names.

---

## 6. Nesting Expression (5 Levels)

This is the hardest design problem. The solution borrows from Notion's own page structure — the left-border-as-spine — and uses the pastel depth palette to create a visual stair-step from chapter to deepest leaf.

**The Book Spine System:**

Each nesting level introduces a left border in a progressively warmer pastel tone, creating a colored spine that reads like a layered table of contents.

```
Level 0 — Gateway / Chapter
  ├─ No card border (it's the section opener itself)
  ├─ Background: very subtle lavender tint `#f4f1fb` (8% opacity lavender)
  ├─ Left accent line: 4px solid `#5645d4` (purple)
  └─ Title: heading-3, charcoal

Level 1 — First child
  ├─ Left border: 3px solid `#5645d4` (purple)
  ├─ Background: white
  ├─ Card shadow: `0 1px 3px rgba(0,0,0,0.06)`
  └─ Indentation: 0px (flush with level 0)

Level 2 — Second depth
  ├─ Left border: 2px solid `#793400` (orange-deep, from Notion brand palette)
  ├─ Background: white
  └─ Indentation: 20px from parent left edge

Level 3 — Third depth
  ├─ Left border: 2px solid `#a02e6d` (pink-deep)
  └─ Indentation: 40px from parent left edge

Level 4 — Deepest (leaf subtask)
  ├─ Left border: 2px solid `#2a9d99` (teal)
  └─ Indentation: 60px from parent left edge
```

**Why this works:** The reader sees a vertical rainbow spine in the page margin — purple at the top (chapter), then orange, pink, teal as depth increases. This is immediately scannable without any legend. It also echoes Notion's colorful sticky-note dots and pastel property pills — the same palette, the same playfulness, but serving structure rather than decoration.

**Visual weight decreases with depth:** Level 0 is bold and structural. Level 4 is narrow and precise. The indentation stacks create a clear visual staircase.

**Gateway grouping:** Children of a gateway are visually grouped by being nested inside the gateway's lavender-tinted background region. The gateway band is the "container page"; its children are the page's content blocks.

**Spawner treatment:** A spawner at any level is visually identical to a leaf of the same depth (left border color matches nesting level), but carries a `badge-tag-sky` mode badge and a small amber "creates N children" indicator when its children are visible.

---

## 7. Task Type Differentiation

**Gateway — Section divider / chapter header:**
- Full-width band with lavender tint background (`#f4f1fb`)
- 4px purple left border
- Heading-3 title in charcoal
- Contains its children in a padding zone below
- No description shown by default (gateways are structural, not informational)
- A small purple filled-square icon (8px) before the title as the one permitted structural icon
- Collapsible: clicking the title collapses/expands all children

**Spawner — Dynamic factory:**
- White card with the depth-matched left border color
- Body-md-medium title in near-black
- `badge-tag-sky` mode badge (sky blue tint + link-blue text)
- When runtime children exist: they appear nested below with the spawner's own depth color inherited
- A subtle amber pulsing dot (4px, `#dd5b00`) beside the mode badge to indicate "this creates work dynamically"

**Leaf — Work unit:**
- White card with the depth-matched left border color
- Body-md-medium title in near-black
- `badge-tag` gray mode badge (or no badge if only one type is active in view)
- Full metadata row: status badge, duration, attempt count
- Checks list, I/O pills, body (collapsed by default)
- On pass: the card's left border briefly crossfades to mint green, then settles back to depth color

**Visual cohesion:** All three share the same card shell, the same spacing, the same typography. Differentiation is achieved through background tint (gateway), mode badge color, and structural icon (gateway only). The family resemblance is strong — they are clearly members of the same design system.

---

## 8. Status & Data Presentation

**Status badges:**
Pill-shaped, `3px 8px` padding, `caption-bold` 13px 600 weight. The background is the pastel tint; the text is the semantic color.

```
[Pass]   — mint `#d9f3e1` bg, `#1aae39` text
[Running] — yellow `#fef7d6` bg, `#a07d20` text
[Failed]  — rose `#fde0ec` bg, `#c0285a` text
[Pending] — gray `#f0eeec` bg, `#787671` text
[Blocked] — cream `#f8f5e8` bg, `#5d5b54` text
```

**Duration:** Displayed as a `micro-uppercase` pill, no background tint, slate color. Format: `56s`, `439ms`, `1m 23s`. Appears inline after the status badge.

**Attempt count:** Shown only when `attempts > 1`. Small slate text: `2/3 attempts`. No pill — it's meta information, not a status signal.

**Checks — compact horizontal rows within the card:**

```
● Normalized JSON exists              ✓  (pass — mint dot + green check)
● At least 10 articles                ✓  (pass — mint dot + green check)
● RSS snapshot exists                  ✗  (fail — rose dot + red x)
```

- Each check is a single row: `[status dot] [description] [result icon]`
- Dot color: mint for pass, rose for fail, gray for pending
- Result icon: small inline SVG checkmark or X, colored to match
- No extra spacing between checks — they form a tight list
- Max 5 checks shown inline; if more, a "Show N more" link appears

**Inputs / Outputs:**
```
Inputs:  [feeds.json]  [config.yaml]
Outputs: [articles.json]  [snapshot.xml]
```

- "Inputs:" / "Outputs:" labels in `caption-bold` stone (`#787671`)
- File names as plain text pills: white background, `1px solid #ede9e4` border, `body-sm` charcoal text, `rounded.sm` (6px)
- Pills wrap to next line if needed, 4px gap between them
- Zero state: if the array is empty, show nothing (not a placeholder)

**Depends on:**
```
← depends on: 01-ingest, 02-cluster
```
- Shown as a slate-colored `body-sm` text line below the title
- Task IDs are clickable — clicking scrolls to and briefly highlights that task
- The left arrow `←` in Notion's muted stone color sets the visual anchor

**Body (collapsed by default, expanded on interaction):**
- Rendered as markdown in `body-md` 16px with 1.65 line-height
- Max-width 620px inside the card
- Code blocks: `body-sm` monospace, `#f0eeec` background, `rounded.sm` (6px)
- Links: Notion link-blue `#0075de`
- No heading styles larger than `heading-5` (18px) — inside a card, H3/H2 scale would be jarring

---

## 9. Interaction Design

**Expand / collapse task body:**
- The task title is the click target — clicking anywhere on the title row expands the body
- The expand indicator: a small right-pointing chevron (SVG, 12px, slate) that rotates 90° clockwise on expand
- Animation: `max-height` transition 300ms ease + opacity fade-in 200ms ease
- Multiple tasks can be expanded simultaneously — the page grows naturally
- Click the title again to collapse

**Card hover:**
- Shadow increases from `0 1px 3px rgba(0,0,0,0.06)` to `0 2px 6px rgba(0,0,0,0.08)`
- Left border brightens: depth border color shifts slightly toward its lighter variant
- Transition: 150ms ease — snappy, Notion-fast
- No scale, no lift — just the subtle shadow telling you this card is a surface

**Gateway collapse / expand all children:**
- Clicking a gateway title collapses the entire subtree below it
- Chevron on gateway title rotates accordingly
- State persists during the session (in-memory, not localStorage)

**Check interaction:**
- Checks are read-only — they reflect runtime state, not user input
- No hover state on check rows (they are data, not controls)
- Pending checks (no result yet) show a gray pulsing dot to indicate "waiting"

**I/O pill hover:**
- Pills gain a `#ede9e4` background on hover — very subtle
- Tooltip on hover: the full file path if truncated (not needed in most cases since pills show full names)

**Filter bar (top of page, above playbook title):**
- A small row of pill-tab filters: `[All] [Gateway] [Spawner] [Leaf] [Pass] [Failed]`
- Default: `[All]` active
- Active filter: `pill-tab-active` — dark background (`#1a1a1a`), white text
- Inactive: `pill-tab` — steel text, transparent background, hairline border
- Filtering hides tasks that don't match; no animation, just instant show/hide
- Shows a count: `[All (12)] [Leaf (8)] [Pass (6)]` — counts update reactively

**Keyboard:**
- `Tab` navigates between task titles
- `Enter` / `Space` on focused task expands/collapses body
- `Escape` collapses all open tasks

**Reduced motion:** All animations disabled when `prefers-reduced-motion: reduce` is set. Expand/collapse is instant.

---

## 10. Signature Touches

### The Book Spine — Notion's Pastels as Depth Signal

The most distinctive visual element is the colored left border that grows through Notion's own palette as nesting deepens — purple at the chapter level, orange-deep, pink-deep, teal. This is immediately scannable: you know your depth the moment you glance at the margin. It also means that reading a deep-nested leaf, you see a teal spine — the color of Notion's teal brand accent. The whole page is branded by its own palette serving structure. No legend needed.

### The Lavender Gateway Band — Notion's Card Tints Applied to Structure

Gateway tasks use the lavender pastel (`#e6e0f5`) as a subtle background tint — not a solid fill, but 8% opacity lavender. This is pulled directly from Notion's `card-tint-lavender` palette applied to the structural element. It means that the chapter/section level feels warm and different from the white task cards below, without breaking the white-on-warm-white constraint. It's Notion's colorful personality working for the hierarchy, not against it.

### The Pass Flash — Subtle Positive Feedback

When a leaf task transitions to `pass`, the card's left border briefly crossfades from its depth color to mint green (`#2a9d99` → `#1aae39`) for 800ms, then settles back. This is the only moment of animation-driven status communication in the design — a small celebration that says "this unit of work is done" without a toast notification or a modal. The muted green is Notion's own `{semantic-success}` — the brand's confirmation color applied precisely once per passing task.

---

## 11. Component Inventory

### `hb-page` — The page shell
- Background: `#fafaf9`
- Content column: max-width 680px, auto-centered
- Padding: 64px top, 32px sides on desktop; 40px top, 24px sides on mobile

### `hb-playbook-header` — Top of the page
- Playbook name: `heading-1` 36px 600, charcoal `#37352f`, margin-bottom 12px
- Playbook description: `subtitle` 16px 400, slate `#5d5b54`, max-width 560px, margin-bottom 40px
- Filter bar: pill-tabs row, 8px below description

### `hb-gateway` — Section / chapter container
- Background: `#f4f1fb` (lavender tint, ~8% opacity)
- Border-radius: `rounded.lg` (12px)
- Left border: 4px solid `#5645d4`
- Padding: 20px 24px
- Title: `heading-3` 22px 600, charcoal, with small purple filled-square icon (8px) prefix
- Expand chevron: slate SVG, 12px, right of title, rotates 90° on expand
- Children zone: padding-top 16px
- Separated from next section by 40px

### `hb-task-card` — Individual task
- Background: `#ffffff`
- Border-radius: `rounded.lg` (12px)
- Box-shadow: `0 1px 3px rgba(0,0,0,0.06)`
- Padding: 16px 20px
- Left border: `3px solid [depth-color]` (per nesting level)
- Margin-bottom between siblings: 12px
- Hover: shadow → `0 2px 6px rgba(0,0,0,0.08)`, 150ms ease

### `hb-task-title` — Task name row
- `body-md-medium` 16px 500, near-black `#1a1a1a`
- Cursor: pointer
- Expand chevron (12px slate SVG) right of title, rotates 90° on expand
- Hover: title color shifts to `#37352f`

### `hb-task-description` — Task brief explanation
- `body-sm` 14px 400, slate `#5d5b54`
- Margin-top: 4px
- Only shown if description is non-empty

### `hb-mode-badge` — Leaf / Spawner / Gateway label
- `micro-uppercase` 11px 600, letter-spacing 1px
- `badge-tag-purple` for gateway (lavender bg, deep purple text)
- Custom sky badge for spawner (sky bg `#dcecfa`, link-blue text `#0075de`)
- `badge-tag` gray for leaf (gray bg, steel text)
- Amber pulse dot (4px `#dd5b00`) beside spawner badge when runtime

### `hb-status-badge` — Runtime status pill
- `caption-bold` 13px 600
- Pastel-tint background per status (see section 8)
- Colored text per status (see section 8)
- Border-radius: `rounded.full`
- Appears inline after the mode badge

### `hb-duration` — Duration display
- `micro-uppercase` 11px 600, slate `#787671`
- No background pill — just text
- Format: `439ms`, `56s`, `1m 23s`

### `hb-checks-list` — Verification results
- No outer container — rows flow inline
- Each row: `[dot] [description text] [icon]`
- Dot: 6px circle, mint/rose/gray per result
- Icon: 12px inline SVG checkmark or X, colored
- Row padding: `6px 0`
- Separator: none between checks — they form a compact list

### `hb-io-row` — Inputs / Outputs
- "Inputs:" / "Outputs:" label: `caption-bold` 13px 600, stone `#787671`
- Pills: `body-sm` 14px 400, charcoal text, white bg, `1px solid #ede9e4`, `rounded.sm` (6px), padding `4px 10px`
- Gap between pills: 6px
- Wrap: allowed
- Empty state: row hidden

### `hb-depends-on` — Dependency line
- `body-sm` 14px 400, slate `#5d5b54`
- Text: `← depends on: [task-id], [task-id]`
- Task IDs: clickable, link-blue `#0075de`, underline on hover
- Margin-top: 8px

### `hb-task-body` — Expanded markdown
- `body-md` 16px 400, near-black `#1a1a1a`, line-height 1.65
- Max-width: 620px
- Margin-top: 16px
- Border-top: `1px solid #ede9e4`
- Padding-top: 16px
- Code blocks: monospace, `#f0eeec` background, `rounded.sm` (6px), `body-sm` size
- Links: link-blue `#0075de`

### `hb-filter-bar` — Top filter row
- `pill-tab` + `pill-tab-active` components from Notion design system
- Default active: `[All]`
- Show count in each tab: `[All (12)]`
- Gap between tabs: 6px

---

## 12. Responsive Behavior

| Breakpoint | Width | Key Changes |
|---|---|---|
| Mobile | < 480px | Single column. Title 28px. Cards 12px padding. Filter bar scrolls horizontally. |
| Tablet | 480–767px | Title 32px. Standard card padding. Filter bar wraps to 2 rows if needed. |
| Desktop | 768–1023px | Title 36px. Full card padding. 680px column, auto-centered. |
| Wide | ≥ 1024px | Full presentation. 680px column with generous side margins. |

**Depth indentation scales on mobile:**
- Level 2 indentation: 12px (down from 20px)
- Level 3 indentation: 24px (down from 40px)
- Level 4 indentation: 36px (down from 60px)

This prevents the narrowest screens from losing readability in deep nests.

**Filter bar:** Horizontal scroll on mobile, no wrapping. Small scroll shadow indicators (gradient fade) at left/right edges when overflow exists.

**Card horizontal padding reduces on mobile:** 20px → 14px to give more room for content in narrow columns.

---

## 13. Implementation Notes

**Font loading:** The handbook should load Notion Sans before falling back to Inter. Since Notion Sans is not a public CDN font, use:

```css
font-family: 'Inter', -apple-system, system-ui, 'Segoe UI', sans-serif;
```

The visual difference from Notion's proprietary Notion Sans is acceptable — the design uses Notion's proportions and weight, not its exact typeface file. If Notion Sans is available (e.g., if a brand font kit is provided), swap it in.

**CSS custom properties:** Define all tokens as CSS variables on `:root` so the component library can reference them consistently:

```css
:root {
  --hb-bg: #fafaf9;
  --hb-card: #ffffff;
  --hb-charcoal: #37352f;
  --hb-nearblack: #1a1a1a;
  --hb-slate: #5d5b54;
  --hb-stone: #787671;
  --hb-hairline: #ede9e4;
  --hb-purple: #5645d4;
  --hb-depth-0: #5645d4;
  --hb-depth-1: #5645d4;
  --hb-depth-2: #793400;
  --hb-depth-3: #a02e6d;
  --hb-depth-4: #2a9d99;
  --hb-shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --hb-shadow-md: 0 2px 6px rgba(0,0,0,0.08);
}
```

**Animation durations:** Define as variables so they can be disabled for `prefers-reduced-motion`:

```css
:root {
  --hb-duration-fast: 150ms;
  --hb-duration-base: 200ms;
  --hb-duration-expand: 300ms;
  --hb-easing: ease;
}
```

**Status crossfade for pass animation:** Use a CSS transition on the `border-color` property of the task card. The pass-flash should be a CSS class `.hb-task-card--pass-flash` that sets `border-color: #1aae39` and removes itself after 800ms via a `setTimeout`.

**Markdown rendering:** Use a lightweight markdown parser (e.g., `marked` or `markdown-it`) to render task bodies. Scope all markdown styles inside `.hb-task-body` to prevent global style leakage.

**Task data shape:** The component library receives a normalized task tree. The top-level `hb-playbook` component receives the full playbook object and renders recursively via `hb-gateway` and `hb-task-card`. The depth level is passed as a context/prop and used to select the correct `--hb-depth-N` border color.

**No icons except one:** The only permitted icon in the structural layout is the 8px purple filled-square before gateway titles. All other visual communication is through color, typography, and spatial hierarchy. Status uses pastel dot indicators; mode uses badge color; expand state uses chevron rotation.

**Performance:** The handbook should render all visible tasks eagerly (no virtual scrolling needed for typical playbook sizes). Collapse state should be managed in React state or a lightweight vanilla JS store. No localStorage persistence of collapse state — the page resets on reload.
