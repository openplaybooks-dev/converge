# BMW M — Living Playbook Design Specification

## 1. Brand Interpretation

BMW M carries a motorsport-engineering identity: precise, confident, restrained. The energy comes from the M tricolor stripe and the editorial contrast between heavyweight display type and engineered light body copy. On the track, a playbook is a precision instrument — it must communicate task hierarchy unambiguously under inspection.

Our adaptation for the book surface is a translation, not a rebrand. We take the weight contrast (heavy headlines, light body) and the tricolor stripe as brand signatures, but flip the canvas from black to warm white `#FAFAF8`. The result reads as BMW M's editorial restraint applied to paper — a reference document that feels engineered rather than decorated.

---

## 2. Page Composition

- **Container**: single column, `max-width: 720px`, centered on the page with `margin: 0 auto`
- **Reading flow**: top-to-bottom, no navigation chrome, no sidebar, no grid — pure vertical scroll
- **Page background**: warm white `#FAFAF8`. The single unifying surface.
- **No sticky elements**. The reader scrolls to explore, exactly as in a printed handbook.
- **Section breathing**: chapters (gateway tasks) open with their title section, then nested content. Between each top-level gateway, add `48px` of vertical gap — visually distinct from the `16px` gaps between child cards.

---

## 3. Typography Scale

Font family: **BMW Type Next Latin** where available, falling back to `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Label all-caps and title text carries the engineered-weight feel even without the proprietary font.

BMW M's signature is weight contrast: headlines at 700, body at 300. We preserve this reading direction while adapting to on-paper scale:

| Element | Size | Weight | Line Height | Letter Spacing | Color |
|---|---|---|---|---|---|
| Playbook title | 28px | 700 | 1.1 | 0 | `#1A1A1A` |
| Gateway / chapter heading | 20px | 700 | 1.2 | 0 | `#1A1A1A` |
| Level 2 heading | 17px | 700 | 1.2 | 0 | `#1A1A1A` |
| Level 3 heading | 15px | 500 | 1.3 | 0 | `#1A1A1A` |
| Level 4 heading | 14px | 500 | 1.3 | 0 | `#2A2A2A` |
| Task title (leaf) | 14px | 500 | 1.3 | 0 | `#1A1A1A` |
| Description | 13px | 300 | 1.55 | 0 | `#5A5A5A` |
| Body / task instructions | 14px | 300 | 1.65 | 0 | `#1A1A1A` |
| Badge label | 11px | 700 | 1.0 | 1.2px | per badge |
| Check label | 12px | 300 | 1.4 | 0 | `#6A6A6A` |
| Duration / meta | 11px | 400 | 1.0 | 0.3px | `#7A7A7A` |
| Category / mode label | 11px | 400 | 1.0 | 0.8px | `#8A8A8A` |

**Note**: Avoid using size `16px` here — the book format reads better at the tighter scale above. The page is not a marketing surface; the typography is closer to a technical reference.

---

## 4. Color Mapping

The BMW M dark-canvas system inverts to paper on a warm white canvas:

| Role | Hex | Use |
|---|---|---|
| Background / page surface | `#FAFAF8` | The universal surface; warm white, never pure `#FFF` |
| Primary text / ink | `#1A1A1A` | Headings, task titles, body text |
| Secondary text | `#5A5A5A` | Descriptions, secondary metadata |
| Tertiary text | `#8A8A8A` | Mode labels, fine print |
| Card surface | `#FFFFFF` | All task cards float on white |
| Card shadow | `rgba(0,0,0,0.07)` | Primary shadow depth; lifted to `0 2px 6px rgba(0,0,0,0.10)` on hover |
| Hairline separator | `#E8E5E0` | 1px hairlines between nested structures |
| M Blue Light | `#0066b1` | M tricolor stripe — first band; used as link accent |
| M Blue Dark / BMW Blue | `#1c69d4` | M tricolor — middle band; link hover state |
| M Red | `#e22718` | M tricolor — final band; accent on brand-identity moments only |
| Hairline dark | `#3c3c3c` | Border use within dark-accent contexts only (e.g., input fields if they appear) |

### Status Colors (Badges)

BMW M badges are small, pill-shaped, subtle — exactly as specified:

| Status | Background | Text | Notes |
|---|---|---|---|
| Pass | `#E8F5E9` | `#2E7D32` | Sage green — muted, not saturated |
| Running | `#FFF8E1` | `#B8860B` | Warm amber — muted |
| Failed | `#FFEBEE` | `#C62828` | Dusty rose — muted |
| Pending | `#F5F5F5` | `#757575` | Light neutral |
| Blocked | `#F3E5F5` | `#6A1B9A` | Subtle lavender tint |
| Leaf mode | `#EEEEEE` | `#424242` | Neutral subtle background |
| Spawner mode | `#E3F2FD` | `#1565C0` | Subtle sky tint |
| Gateway mode | `#E8EAF6` | `#283593` | Subtle indigo tint |

---

## 5. Spacing System

BMW M's base unit is 4px. We use it at this scale:

| Token | Value | Use |
|---|---|---|
| `--space-tiny` | 4px | Micro gaps within badge padding |
| `--space-xs` | 8px | Internal padding in compact rows |
| `--space-sm` | 12px | Padding inside small elements |
| `--space-md` | 16px | Standard card gap, inter-element spacing |
| `--space-lg` | 24px | Card internal padding (with rounded corners) |
| `--space-xl` | 40px | Between top-level gateway sections |
| `--space-2xl` | 64px | Page top/bottom padding |

**Card rounding**: 8px for all task cards. No square corners — 8px is the minimum warmth that reads as "book" rather than "product UI." (BMW M's system uses mostly 0px, but that's for dark-canvas marketing; paper benefits from the slight softness.)

**Card internal padding**: `20px 24px` — generous on the horizontal, comfortable on the vertical.

**Nesting indent**: Each child level indents `20px` from the parent's left edge. Deep levels stack visually without ambiguity.

---

## 6. Nesting Expression — 5 Levels of Depth

This is the most structurally critical part of the spec. Each level must be immediately readable as belonging to a specific depth:

| Level | Task Type | Visual Treatment |
|---|---|---|
| 0 | Gateway (chapter) | No card. Title renders as section heading: `font-size: 20px, weight: 700`, preceded by a 3px M tricolor stripe (left border, 48px wide). Gap above: `40px`. |
| 1 | Gateway / Spawner | White card with `border-left: 3px solid #1c69d4` (BMW Blue), `border-radius: 8px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.07)`. Title: `font-size: 17px, weight: 700`. Children indented 20px from this card's left edge. |
| 2 | Gateway / Leaf / Spawner | White card, `border-left: 2px solid #E8E5E0` (hairline), `border-radius: 8px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.06)`. Title: `font-size: 15px, weight: 500`. |
| 3 | Leaf / Spawner | White card, no left border, `border-radius: 8px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.05)`. Title: `font-size: 14px, weight: 500`. Description visible at this level and above. |
| 4 | Leaf (subtask) | No card frame. Content appears as a tighter row: title `font-size: 13px, weight: 400`, description at `13px, weight: 300`, inline badge cluster. Maintains a `1px solid #F0EEEA` separator above. No box shadow — the most de-elevated surface. |

**The progressive de-emphasis principle**: Each deeper level steps down in one visual dimension — left border thickness drops, shadow softens, font size decreases, spacing tightens — while maintaining full readability. A reader skimming the page can see the structure at a glance. A reader diving deep can follow the hierarchy without reorientation.

---

## 7. Task Type Differentiation

### Gateway
- **Visual**: Left-border accent (3px BMW blue, or M tricolor block at level 0), no status badge (structural, not runtime), no duration, no check results
- **Content shown**: Title + description only
- **Interaction**: Click to expand/collapse the section; chevron indicator rotates 90deg
- **Never shows**: status badge, duration, check list

### Spawner
- **Visual**: Left-border accent (2px lighter blue), subtle mode badge ("spawner", uppercase small caps), small chevron
- **Content shown**: Title + description + mode badge + child preview hint ("discovered tasks appear here")
- **Interaction**: Click to reveal children as they're generated
- **Visual cue**: A subtle animated pulse on the mode badge while children are being discovered

### Leaf
- **Visual**: No left border or subtle 1px hairline, full status badge, checks, duration, inputs/outputs, expand-to-reveal body
- **Content shown**: Title + description + status + mode badge + inputs + outputs + check list + duration + attempts
- **Interaction**: Click anywhere on the card to reveal the body (task instructions) in a smooth height animation
- **Check rendering**: Each check as a small inline pill — checkmark icon (✅) in sage green for pass, (✗) in dusty rose for fail, (—) in gray for pending. Description beside the icon.

---

## 8. Status & Data Presentation

### Status Badge

Positioned top-right of the task card, inline with the mode badge. Pill shape: `border-radius: 999px`, `padding: 3px 10px`, `font-size: 11px, gap: 6px`.

**Pass**: `background: #E8F5E9; color: #2E7D32;` + small checkmark glyph

**Running**: `background: #FFF8E1; color: #B8860B;` + small animated dot (CSS pulse, 1.2s)

**Failed**: `background: #FFEBEE; color: #C62828;` + × glyph

**Pending**: `background: #F5F5F5; color: #757575;` + dash glyph

**Blocked**: `background: #F3E5F5; color: #6A1B9A;` + pause glyph

### Mode Badge

Small pill, positioned left of status badge: `padding: 2px 8px, font-size: 10px, weight: 700, letter-spacing: 1px, text-transform: uppercase`. Background tint per-mode (from the status color table above). Visual shorthand so the reader instantly knows if this task does work, spawns children, or organizes structure.

### Checks Display

Rendered below the description, above the body:
- Heading: "Checks" in `font-size: 11px, weight: 700, letter-spacing: 1px, text-transform: uppercase, color: #888`
- Each check as a single row: `[icon] description — status text`
- Icon: `✓` sage green for pass, `✗` dusty rose for fail, `—` gray for pending
- Spacing: `8px` between checks

### Duration

Right-aligned in a small monospace-feel cell: `font-size: 11px, color: #888`. Format: `439ms`, `56s`. Shown only on completed tasks (pass or failed).

### Inputs / Outputs

Each as a small pill row below checks: "Inputs: [feeds.json, articles.json]" — the filenames shown as `background: #F5F5F5` micro-badges inside the card body.

---

## 9. Interaction Design

### Hover State (all task cards)
- Shadow lifts from `0 1px 3px rgba(0,0,0,0.06)` to `0 2px 6px rgba(0,0,0,0.10)`
- Transition: `200ms ease`
- No size change (no transform)

### Expand / Collapse (gateway sections, leaf bodies)
- Height animates from `0` to natural content height
- Card's chevron icon rotates 90deg clockwise when expanded
- Body content fades in at `opacity: 0→1` over `200ms` with a `100ms` delay after height transition begins

### Body Reveal (leaf tasks)
- Clicking a leaf task card reveals its `body` (instructions / methodology)
- The reveal panel slides open below the title/description row
- Markdown inside is rendered with proper typography: `p` at `14px/300/1.65`, `code` in monospace with a subtle `background: #F5F5F5` background, `ul`/`ol` with `16px` left indent, `strong` at `weight: 600`
- An inline "Close" behavior on the revealed body via a small × in the top-right corner of the panel

### M Stripe Divider
When a gateway (level 0) is expanded: the M tricolor stripe (light blue → dark blue → red, each ~14px wide, 3px tall) renders as a left-border accent beside the gateway heading. This is the brand's signature moment rendered in context — motorsport precision as section framing.

### prefers-reduced-motion
All transitions (`box-shadow`, `transform`, `height`, `opacity`) wrapped in `@media (prefers-reduced-motion: no-preference)`. When user prefers reduced motion, transitions are `0ms`.

---

## 10. Signature Touches

**1. The M Tricolor as Section Framing.** At the top-level gateway, render the M tricolor stripe — `#0066b1` → `#1c69d4` → `#e22718` — as a 3-section left border (each color ~4px wide, total ~12px) beside the gateway title. This is the one moment on the page where BMW M's motorsport identity has a proper stage. Used nowhere else, so it reads with significance.

**2. Weight Contrast on the Playbook Title.** The playbook title renders at `28px / 700` — heavy, uppercase-feel (even in title case, the weight does the work). Below it, the description in `14px / 300`. This is the exact weight-contrast editorial signature from BMW M's marketing system, applied without the dark canvas.

**3. Monospace Duration Cells.** Duration values (e.g., `439ms`, `56s`) render in `font-family: "SF Mono", "Fira Code", "Cascadia Code", monospace` at `11px`. On a book page full of proportional type, a monospace detail in the meta information feels engineered and precise — it echoes BMW M's technical-performance identity. Small, but it differentiates.

---

## Implementation Notes

- All shadow values must use `rgba(0,0,0,...)` — never `hex` shadows, never colored shadows
- Card border-radius is `8px` everywhere — no variants with `0px` needed for this surface
- The M tricolor colors (`#0066b1`, `#1c69d4`, `#e22718`) are exceptions to the muted-status rule — they're used only as the brand-identity stripe at gateway level-0 and on hover/focus accents on links
- No fixed headers, no sticky navigation, no scrolling chrome of any kind — the page must feel like a document
- Background is always `#FAFAF8`. Never transition to a dark surface within the document
