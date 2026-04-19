# Screen Specification: Weight & Nutrition

## 1. Screen Title

Weight & Nutrition

## 2. Purpose

Track pregnancy weight changes over time, visualize progress via a line chart, display current BMI on a segmented gauge, and surface stage-appropriate nutrition tips. Serves as the primary weight-management and dietary-guidance surface, combining data entry, data visualization, and educational content in a single scrollable screen.

## 3. Route

`/weight`

## 4. Widget Name

`WeightNutritionScreen`

## 5. Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary Canvas | Lavender Mist (#EDE8F7) | Screen background |
| Card Surface | Cloud White (#FFFFFF) | All content cards |
| Primary Accent | Coral Bloom (#F28B8B) | FAB, active states, weight value highlight |
| Coral Whisper | rgba(242, 139, 139, 0.12) | Active tab pill, soft highlights |
| Secondary Accent | Lilac Pulse (#8B7ED8) | Chart line stroke, data visualization |
| Lilac Whisper | rgba(139, 126, 216, 0.14) | Chart fill area beneath line |
| Text Primary | Ink Charcoal (#2A2A3A) | Headings, weight values |
| Text Secondary | Muted Quartz (#8B8B9C) | Labels, metadata, unit suffixes |
| Divider | Ghost Divide rgba(42, 42, 58, 0.06) | List separators in weight history |
| Chip Background | Chip Mist rgba(139, 126, 216, 0.08) | Inactive chips, metadata pills |
| Success | Field Green (#6DC48A) | On-track weight indicator |
| Warning | Caution Amber (#F4C84D) | Approaching weight limits |
| Error | Fault Red (#E85C5C) | Out-of-range weight alert |
| BMI Underweight | #5BB4E5 | BMI gauge segment < 18.5 |
| BMI Healthy | #6DC48A | BMI gauge segment 18.5–25 |
| BMI Caution | #F4C84D | BMI gauge segment 25–30 |
| BMI Warning | #F59052 | BMI gauge segment 30–35 |
| BMI Alert | #E85C5C | BMI gauge segment > 35 |

### Typography

| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Screen title | Display (2rem) | 800 | "Weight & Nutrition" in app bar |
| Weight readout | Stat (2.25rem) | 800 | Large numeric weight value |
| BMI readout | Stat (2.25rem) | 800 | BMI numeric display |
| Section headers | Heading (1.5rem) | 700 | "Weight", "BMI", "Nutrition Tips" |
| Card titles | Subheading (1.125rem) | 600 | Chart card label, history heading |
| Body text | Body (1rem) | 400 | Nutrition tip descriptions |
| Metadata | Data (0.875rem) | 500 | Unit labels ("Kg", "cm"), dates |
| Helper text | Caption (0.8125rem) | 400 | Chart axis helper text, footnotes |
| Chart axis labels | Micro (0.6875rem) | 700 | X/Y axis labels on chart |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| Screen horizontal padding | 20dp (1.25rem) | Left/right content inset |
| Section gap | 24dp | Between chart, BMI gauge, stats, tips, history |
| Card internal padding | 20dp | Inside all content cards |
| Chart internal padding | 32dp | Extra padding inside hero chart card |
| List item spacing | 12dp | Between weight history entries |
| Quick stats gap | 12dp | Between stat items in row |

### Corner Radius

| Token | Value | Usage |
|-------|-------|-------|
| Chart card | 32dp (2rem) | Hero-level weight chart card |
| Content cards | 24dp (1.5rem) | BMI gauge card, nutrition tips, history |
| FAB | 9999px | Fully rounded |
| BMI gauge segments | 9999px | Fully rounded pill segments |
| Chips | 9999px | Nutrition category chips |

### Elevation

| Token | Shadow | Usage |
|-------|--------|-------|
| Prominent | 0 8px 32px rgba(139, 126, 216, 0.14) | Weight chart card (hero) |
| Standard | 0 4px 20px rgba(139, 126, 216, 0.12) | BMI card, stats, tips, history |
| FAB | 0 4px 20px rgba(139, 126, 216, 0.12) | Floating action button |
| Bottom Nav | 0 -4px 20px rgba(139, 126, 216, 0.08) | Tab bar |

## 6. Layout Rules

### Scaffold

- **AppBar:** `SliverAppBar` with title "Weight & Nutrition", collapsing on scroll. Title in Display scale, Ink Charcoal. Back button shown if push-navigated from home stat card; hidden if reached via tab.
- **Body:** `CustomScrollView` containing sliver-based sections on Lavender Mist canvas.
- **BottomNavigationBar:** Visible. Health tab active. Cloud White background, Coral Bloom active icon/label on Coral Whisper pill, Muted Quartz inactive.
- **FAB:** `FloatingActionButton` in Coral Bloom for logging a new weight entry. Lucide `plus` icon at 22px, Cloud White. Positioned bottom-right, 20dp inset from edges, above bottom nav z-index.

### Content Width

Full viewport width with 20dp horizontal padding. No max-width wrapper. Cards fill available width.

### Vertical Spacing

Content starts 0.75rem below status bar safe-area inset. Sections separated by 24dp gaps. Content ends 0.75rem above tab bar.

## 7. Sections

### 7.1 Weight Chart Card

- **Description:** Line chart showing weight over time. Displays the full history of weight entries with the current value prominently highlighted. Acts as the visual anchor of the screen.
- **Widget type:** Cloud White card containing a `Column` with a heading row and an SVG/Canvas-based line chart.
- **Container:** 32dp border-radius (hero-level), prominent elevation shadow, 32dp internal padding.
- **Data requirements:** `List<WeightEntry>` sorted by `date` ascending. Current pregnancy week from `PregnancyProfile`.
- **Chart specification:**
  - Stroke: Lilac Pulse (#8B7ED8) at 2.5px width, rounded line caps
  - Fill: Lilac Whisper gradient fading from 30% opacity at stroke down to 0% at baseline
  - Data points: 6px circles, Lilac Pulse fill with 2px Cloud White stroke. Active point: 10px with halo ring
  - Gridlines: Dashed Ghost Divide lines at 1px, horizontal and vertical
  - X-axis: Date labels in Micro scale, Muted Quartz
  - Y-axis: Weight values in Micro scale, Muted Quartz
  - Current-value indicator: Vertical line in Lilac Pulse from data point to x-axis, with value label anchored beside the point
- **Interactive elements:**
  - Tap chart data point → highlight value with tooltip showing date and weight
  - Pan horizontally → scroll through extended date range if entries exceed visible width

### 7.2 BMI Gauge Card

- **Description:** Horizontal 5-segment gauge showing current BMI with a needle indicator, plus height input toggle and BMI numeric display.
- **Widget type:** Cloud White card containing a `Column` with BMI value display, gauge visualization, and height control row.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** Current weight (latest `WeightEntry.value`), height from `PregnancyProfile.height`, calculated BMI.
- **Gauge specification:**
  - 5 pill-shaped segments in a horizontal row, equal width, 4px gaps
  - Segment height: 18px, fully rounded ends
  - Segment colors (left to right): Underweight Blue (#5BB4E5), Healthy Green (#6DC48A), Caution Yellow (#F4C84D), Warning Orange (#F59052), Alert Red (#E85C5C)
  - Threshold labels beneath each segment: BMI boundary values in Caption scale, Muted Quartz
  - Needle: 2px wide vertical indicator in Ink Charcoal, positioned by current BMI. Numeric BMI value in Subheading scale floating above the needle
- **Content below gauge:**
  - Height row: Label "Height" (Caption scale, Muted Quartz), value display (Data scale, Ink Charcoal), edit icon (Muted Quartz, 18px). Tap opens height edit bottom sheet.
  - BMI category label: e.g., "Healthy" in corresponding gauge color, Caption scale
- **Interactive elements:**
  - Tap height row → bottom sheet with height input (cm or inches based on user unit preference)
  - Tap BMI value → no action (informational)

### 7.3 Quick Stats Row

- **Description:** Horizontal row of key weight statistics: current weight, change this week, and target range.
- **Widget type:** `Row` of compact stat items, evenly spaced.
- **Container:** Cloud White card, 24dp border-radius, standard elevation, 20dp padding.
- **Data requirements:** Latest `WeightEntry.value`, previous week's `WeightEntry.value`, recommended weight range for current pregnancy week.
- **Stats displayed:**
  - Current Weight: value in Stat scale (Coral Bloom), unit in Data scale (Muted Quartz). E.g., "50.3 Kg"
  - Weekly Change: delta value with +/- prefix in Subheading scale. Field Green if within range, Caution Amber if approaching limit, Fault Red if out of range.
  - Target Range: range string in Data scale, Muted Quartz. E.g., "48–55 Kg"
- **Interactive elements:** Tap any stat → no action (informational)

### 7.4 Nutrition Tips Card

- **Description:** Stage-appropriate nutrition and hydration tips updated per pregnancy week/trimester. Provides brief, actionable dietary guidance.
- **Widget type:** Cloud White card containing a `Column` with heading and a vertical list of tip items.
- **Container:** 24dp border-radius, standard elevation, 20dp padding.
- **Data requirements:** Nutrition tips keyed to current trimester or pregnancy week from `PregnancyProfile.currentTrimester`.
- **Content:**
  - Heading: "Nutrition Tips" (Subheading scale, Ink Charcoal)
  - Each tip: icon (Lucide, 20px, Lilac Pulse) + text (Body scale, Ink Charcoal) in a row. Ghost Divide between tips.
  - Tips cover: key nutrients, hydration reminders, foods to favor, foods to avoid for the current stage.
- **Interactive elements:**
  - Tap individual tip → expand with additional detail text (Caption scale, Muted Quartz) below the tip row

### 7.5 Weight History List

- **Description:** Chronological list of all weight entries with date, value, and optional notes.
- **Widget type:** `SliverList` with Ghost Divide separators between items.
- **Container:** Cloud White card wrapping the list, 24dp border-radius, standard elevation, 20dp padding.
- **Data requirements:** `List<WeightEntry>` sorted by `date` descending.
- **Item layout:** Each item is a row — left side shows date (Data scale, Muted Quartz) and optional notes preview (Caption scale, Muted Quartz truncated to one line); right side shows weight value (Subheading scale, Ink Charcoal) with unit label (Data scale, Muted Quartz) and a trailing chevron-right icon (Muted Quartz, 18px).
- **Interactive elements:**
  - Tap item → push to weight entry detail/edit view
  - Swipe item left → reveal delete action (Fault Red background, confirm via dialog)

## 8. Data

### Entities

**WeightEntry** (primary)
- `id`: String — unique identifier
- `date`: DateTime — date of weight measurement
- `value`: double — weight value in user-preferred units
- `notes`: String? — optional user annotation

**PregnancyProfile** (context)
- `height`: double — user height for BMI calculation
- `units`: WeightUnit (kg/lbs) — display unit preference
- `currentWeek`: int — current pregnancy week (calculated)
- `currentTrimester`: int — current trimester (calculated)
- `userName`: String — for greeting display if needed

### Calculated Fields
- **BMI:** `value / (height_in_meters ^ 2)` using latest weight entry and profile height
- **Weekly change:** Latest weight minus weight entry closest to 7 days prior
- **Target range:** Recommended weight gain range for current pregnancy week based on pre-pregnancy BMI category (standard IOM guidelines)
- **Weight trend:** Directional indicator (gaining, stable, losing) based on last 3 entries

## 9. Motion

### Entry Animations
- Weight chart card enters via `translateY(12px)` → `translateY(0)` with opacity 0 → 1, spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`), 450ms.
- Chart line draws left-to-right over 800ms via `stroke-dashoffset`. Fill area fades in with 400ms offset after line completes.
- Chart data points reveal sequentially left-to-right, 60ms stagger per point, after line draw.
- BMI gauge card enters with 80ms stagger delay after chart card, same spring animation.
- BMI gauge segments animate width from 0 to full, 80ms stagger between segments.
- Quick stats row enters with 80ms stagger after BMI card. Numeric values count up from 0 to target over 800ms ease-out on first mount.
- Nutrition tips card and weight history list cascade with 80ms stagger, same spring animation.

### BMI Needle
- Needle slides to its position over 600ms with spring easing after gauge segments finish animating.

### Data Updates
- When a new weight entry is logged, the chart line redraws with a smooth transition (300ms). New data point fades in.
- BMI needle slides to updated position over 400ms spring easing.
- Stat values in quick stats row crossfade (not count-up) on subsequent data changes.

### FAB
- FAB enters on screen mount with spring scale from `0.0` to `1.0`, 400ms, 200ms delay after last content card.

### Bottom Sheet (Weight Entry)
- Slides up from bottom with spring overshoot, 400ms. Dim Veil backdrop fades in over 200ms.

## 10. Accessibility

### Semantics Labels
- Chart card: `Semantics(label: "Weight progress chart showing [count] entries")` wrapping the chart.
- Each chart data point: `Semantics(label: "Weight on [date]: [value] [unit]")`.
- BMI gauge: `Semantics(label: "BMI gauge showing [value], category: [category]")`.
- Each BMI segment: `Semantics(label: "[category] range: [lower] to [upper]")`.
- Quick stats: Each stat has `Semantics(label: "[Label]: [Value] [Unit]")`.
- Nutrition tips: `Semantics(label: "Nutrition tip: [tip text]")` per tip item.
- History list items: `Semantics(label: "Weight entry on [date]: [value] [unit]")`.
- FAB: `Semantics(label: "Log new weight entry", button: true)`.

### Focus Order
1. App bar title and back button (if present)
2. Weight chart card (chart region)
3. BMI gauge card (gauge, height row)
4. Quick stats row (left to right)
5. Nutrition tips card (heading, then tips top to bottom)
6. Weight history list (items top to bottom)
7. FAB
8. Bottom navigation tabs

### Contrast Notes
- Coral Bloom (#F28B8B) on Cloud White (#FFFFFF): contrast ratio ~3.2:1 — meets AA for large text. Used for Stat-scale weight readouts which qualify as large text.
- Lilac Pulse (#8B7ED8) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for chart strokes and data-oriented labels.
- Ink Charcoal (#2A2A3A) on Cloud White: contrast ratio ~13.5:1 — exceeds AAA. Used for all primary text.
- Muted Quartz (#8B8B9C) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text only. Used for secondary/metadata text at Data scale or larger.
- BMI gauge segment colors are not used for text — they serve as background fills with Ink Charcoal or Cloud White text overlays maintaining sufficient contrast.
- All interactive elements maintain 44x44dp minimum touch targets.

## 11. Anti-Patterns

- No emojis for status indicators — use color-coded values and gauge segments per the design system
- No pure black (#000000) anywhere — use Ink Charcoal (#2A2A3A) as darkest value
- No glass morphism or backdrop blur on any surface — opaque Cloud White cards on Lavender Mist canvas
- No circular loading spinners — use skeleton shimmer loaders matching card dimensions
- No 3-column grids — 2-column stat layout is the maximum
- No floating detached tab bar — bottom nav is flush, opaque, grounded
- No hover-only interaction states — all interactions are tap-based
- No generic placeholder names — use contextual demo names if needed ("Mira", "Nora")
- No fabricated medical statistics — weight targets and BMI ranges reference standard IOM guidelines, clearly labeled as estimates
- No medical diagnostic language — this is a tracker, not a diagnostic tool. Avoid "diagnose", "treat", "cure"
- No Inter, Poppins, Roboto, or Montserrat fonts — use Plus Jakarta Sans exclusively
- No linear easing on any animation — spring or ease-out only
- No gradient text on headings — flat color only
- No hard black drop-shadows — all shadows carry lilac tint per Pastel Elevation spec
- No gradient between BMI gauge segments — discrete color zones preserve semantic clarity
- No `h-screen` — use `min-h-[100dvh]` for full-height sections
