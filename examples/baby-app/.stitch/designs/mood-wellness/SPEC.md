# Screen Specification: Mood & Wellness

## 1. Screen Title

Mood & Wellness

## 2. Purpose

Provides a dedicated space for logging daily moods and energy levels, visualizing emotional patterns over time, and surfacing gentle wellness recommendations based on recent trends. Helps expecting mothers maintain awareness of their emotional well-being throughout pregnancy.

## 3. Route

`/mood`

## 4. Widget Name

`MoodWellnessScreen`

## 5. Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary Canvas | Lavender Mist (#EDE8F7) | Screen background behind all cards |
| Card Surface | Cloud White (#FFFFFF) | Today's mood card, chart card, recommendation card, history list items |
| Primary Accent | Coral Bloom (#F28B8B) | FAB fill, active mood level indicator, CTA highlights |
| Coral Whisper | rgba(242, 139, 139, 0.12) | Selected mood level pill background |
| Secondary Accent | Lilac Pulse (#8B7ED8) | Chart stroke, energy level active segments, section headings |
| Lilac Whisper | rgba(139, 126, 216, 0.14) | Chart fill area beneath stroke, energy scale active fill |
| Text Primary | Ink Charcoal (#2A2A3A) | Mood labels, card titles, history entry text |
| Text Secondary | Muted Quartz (#8B8B9C) | Dates, notes preview, helper text, chart axis labels |
| Chip Background | Chip Mist rgba(139, 126, 216, 0.08) | Mood level chips (inactive), energy scale inactive segments |
| Divider | Ghost Divide rgba(42, 42, 58, 0.06) | Between mood history list items |
| Success | Field Green (#6DC48A) | Positive mood indicators (level 4–5) |
| Warning | Caution Amber (#F4C84D) | Neutral mood indicators (level 3) |
| Error | Fault Red (#E85C5C) | Low mood indicators (level 1–2) |

### Typography

| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Screen title | Display (2rem) | 800 | "Mood & Wellness" in app bar |
| Section headers | Heading (1.5rem) | 700 | "Today's Mood", "Mood Trends", "Energy Level", "Recommendations" |
| Card titles | Subheading (1.125rem) | 600 | Mood entry labels, recommendation titles |
| Body text | Body (1rem) | 400 | Recommendation descriptions, mood notes |
| Metadata | Data (0.875rem) | 500 | Mood level labels, energy level labels, chart annotations |
| Helper text | Caption (0.8125rem) | 400 | Date strings, "Tap to log" prompts |
| Axis labels | Micro (0.6875rem) | 700 | Chart axis labels (uppercase), mood level badges |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| Screen horizontal padding | 20dp (1.25rem) | Left/right content inset |
| Section gap | 28dp (1.75rem) | Between major sections |
| Card internal padding | 20dp | Inside each content card |
| List item spacing | 12dp | Between mood history entries |
| FAB bottom offset | 16dp | Above safe-area-inset-bottom |

### Corner Radius

| Token | Value | Usage |
|-------|-------|-------|
| Content cards | 24dp (1.5rem) | Today's mood, chart, recommendations, history cards |
| Mood level chips | 9999px | Pill-shaped mood selectors |
| FAB | 9999px | Circular floating action button |
| Energy segments | 9999px | Rounded energy level bar segments |

### Elevation

| Token | Shadow | Usage |
|-------|--------|-------|
| Standard | 0 4px 20px rgba(139, 126, 216, 0.12) | Content cards, history items |
| Subtle | 0 2px 8px rgba(139, 126, 216, 0.08) | Card press state |
| FAB | 0 8px 32px rgba(139, 126, 216, 0.14) | Floating action button |

## 6. Layout Rules

### Scaffold

- **AppBar:** `SliverAppBar` with title "Mood & Wellness" in Display scale, Ink Charcoal. Collapsing on scroll. Cloud White background.
- **Body:** `CustomScrollView` with vertical scroll on Lavender Mist canvas. Contains sliver sections for each content block.
- **BottomNavigationBar:** Visible. Wellness tab active.
- **FAB:** `FloatingActionButton` — circular, Coral Bloom fill, Cloud White `plus` icon (Lucide, 22px). 56dp diameter. Positioned bottom-right, 16dp above safe-area-inset-bottom. Tap opens mood logging bottom sheet.

### Content Width

Full viewport width with 20dp horizontal padding. No max-width wrapper. Cards fill available width.

### Vertical Spacing

Content starts below the collapsing app bar with 24dp top padding. Major sections separated by 28dp. Mood history items separated by 12dp. Bottom padding clears the FAB (72dp) plus safe-area-inset-bottom.

## 7. Sections

### 7.1 Today's Mood Card

- **Description:** Displays today's logged mood or prompts the user to log if not yet recorded.
- **Widget type:** Cloud White card inside a `SliverToBoxAdapter`.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding. Full width.
- **Data requirements:** `MoodEntry` for today — `moodLevel`, `energyLevel`, `notes`.
- **Content (logged state):**
  - Section header: "Today's Mood" in Heading scale, Ink Charcoal.
  - Mood icon row: five mood level icons in a horizontal `Row`, the selected level highlighted with Coral Whisper background pill and Coral Bloom tint. Unselected icons in Muted Quartz.
  - Mood label: Data scale text beneath the selected icon (e.g., "Feeling Great"), color matching mood semantic (Field Green for 4–5, Caution Amber for 3, Fault Red for 1–2).
  - Notes preview: Body scale, Ink Charcoal, max 2 lines with ellipsis. Omitted if null.
  - Logged time: Caption scale, Muted Quartz.
- **Content (unlogged state):**
  - Section header: "Today's Mood" in Heading scale.
  - Prompt text: "How are you feeling today?" in Body scale, Muted Quartz.
  - Five mood level icons in Muted Quartz, all unselected.
  - "Tap to log" in Caption scale, Coral Bloom.
- **Interactive elements:** Tap card → open mood logging bottom sheet. Tap individual mood icon → quick-select mood level and open bottom sheet with that level pre-selected.

### 7.2 Mood Chart

- **Description:** Line chart showing mood level patterns over the past 14 days.
- **Widget type:** Cloud White card containing an SVG/Canvas line chart.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding plus 12dp extra top padding for the header.
- **Data requirements:** `MoodEntry` list for the past 14 days — `date`, `moodLevel`.
- **Content:**
  - Section header: "Mood Trends" in Heading scale, Ink Charcoal.
  - Y-axis: mood levels 1–5, labeled in Micro scale, Muted Quartz.
  - X-axis: dates over 14 days, labeled in Micro scale, Muted Quartz. Show every other date to avoid crowding.
  - Line stroke: Lilac Pulse (#8B7ED8), 2.5px width, rounded line caps.
  - Fill: Lilac Whisper gradient from 30% opacity at the stroke down to 0% at baseline.
  - Data points: 6px circles, Lilac Pulse fill with 2px Cloud White stroke. Active (tapped) point: 10px with halo ring.
  - Gridlines: dashed Ghost Divide, 1px horizontal lines at each mood level.
  - Empty state: "Not enough data yet" in Body scale, Muted Quartz, centered in the chart area.
- **Interactive elements:** Tap data point → tooltip showing date and mood level. Swipe horizontally → scroll chart if more than 14 days of data.

### 7.3 Energy Level Tracker

- **Description:** Simple horizontal scale showing today's energy level.
- **Widget type:** Cloud White card with a segmented horizontal bar.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** `MoodEntry` for today — `energyLevel` (1–5).
- **Content:**
  - Section header: "Energy Level" in Heading scale, Ink Charcoal.
  - Horizontal bar: 5 pill-shaped segments in a `Row`, each 18dp tall, 4dp gaps between.
  - Filled segments (up to current level): Lilac Pulse fill.
  - Unfilled segments: Chip Mist fill.
  - Current level label: Data scale, Lilac Pulse, below the bar (e.g., "Moderate" for level 3).
  - Unlogged state: all segments in Chip Mist, label reads "Not logged" in Caption scale, Muted Quartz.
- **Interactive elements:** Tap a segment → open mood logging bottom sheet with energy slider pre-set to that level.

### 7.4 Wellness Recommendations Card

- **Description:** Gentle suggestions based on recent mood patterns, nudging the user toward mindfulness exercises or self-care.
- **Widget type:** Cloud White card with a vertical list of recommendation rows.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** Calculated recommendations based on recent `MoodEntry` patterns. Static fallback if insufficient data.
- **Content:**
  - Section header: "Recommendations" in Heading scale, Ink Charcoal.
  - Each recommendation row:
    - Lucide icon (22px, Lilac Pulse) left-aligned.
    - Title: Subheading scale, Ink Charcoal.
    - Description: Caption scale, Muted Quartz. Max 2 lines.
    - Lucide `chevron-right` icon (18px, Muted Quartz) right-aligned.
  - Ghost Divide between recommendation rows.
  - Example recommendations: "Try a breathing exercise", "Take a gentle walk", "Log your gratitude today".
  - Maximum 3 recommendations shown.
- **Interactive elements:** Tap recommendation → navigate to the relevant mindfulness exercise or feature screen.

### 7.5 Mood History List

- **Description:** Chronological list of recent mood entries showing date, mood level, energy level, and notes.
- **Widget type:** `SliverList` of Cloud White cards.
- **Container:** Each card has 24dp border-radius, standard elevation, 20dp internal padding. Full width.
- **Data requirements:** `MoodEntry` list sorted by date descending — `date`, `moodLevel`, `energyLevel`, `notes`.
- **Content:**
  - Each card: a `Row` + `Column` layout:
    - Left: mood level indicator dot (12dp circle) — color based on mood semantic (Field Green for 4–5, Caution Amber for 3, Fault Red for 1–2).
    - Right `Column`:
      - Mood label: Subheading scale, Ink Charcoal (e.g., "Feeling Great", "Feeling Low").
      - Energy: Data scale, Muted Quartz (e.g., "Energy: High").
      - Date: Caption scale, Muted Quartz.
      - Notes preview: Body scale, Ink Charcoal, max 2 lines with ellipsis. Omitted if null.
  - Entries separated by 12dp on Lavender Mist canvas.
  - Empty state: centered text "No mood entries yet" in Body scale, Muted Quartz, with a ghost-style "Log Your Mood" button.
- **Interactive elements:** Tap card → view mood entry detail.

### 7.6 Mood Logging Bottom Sheet

- **Description:** Bottom sheet for creating or editing a mood entry, presented when the FAB or today's mood card is tapped.
- **Widget type:** Bottom sheet (`showModalBottomSheet`) with a `Column` of input controls.
- **Container:** Cloud White fill, 28dp top border-radius, drag handle (40px wide, 4px tall, Chip Mist), Dim Veil backdrop.
- **Data requirements:** None for creation; existing `MoodEntry` for editing.
- **Content:**
  - Title: "How are you feeling?" in Heading scale, Ink Charcoal.
  - Mood selector: horizontal `Row` of 5 mood level icons (pill buttons). Selected: Coral Whisper background, Coral Bloom tint. Unselected: Chip Mist background, Muted Quartz.
  - Energy slider: labeled "Energy Level", 5-step discrete slider. Track: Chip Mist. Active fill: Lilac Pulse. Thumb: Cloud White with subtle shadow.
  - Notes field: optional text input. Soft Ivory background, 1px Ghost Divide border, 1rem border-radius. Placeholder "Add a note..." in Muted Quartz.
  - Save button: full-width pill, Coral Bloom fill, Cloud White text, "Save" in Subheading scale.
- **Interactive elements:** Tap mood icon → select mood level. Drag energy slider → set energy level. Tap save → persist entry and dismiss sheet.

## 8. Data

### Entities

**MoodEntry**
- `id`: String — unique identifier
- `date`: DateTime — date and time of entry
- `moodLevel`: int (1–5) — 1 = very low, 2 = low, 3 = neutral, 4 = good, 5 = great
- `energyLevel`: int (1–5) — 1 = very low, 2 = low, 3 = moderate, 4 = high, 5 = very high
- `notes`: String? — optional free-text note

**PregnancyProfile** (read-only on this screen)
- `userName`: String — for greeting context if needed
- `currentWeek`: int — for week-appropriate wellness recommendations

### Screen Data Flow

- Today's mood card reads the most recent `MoodEntry` where `date` matches today.
- Mood chart loads `MoodEntry` list for the past 14 days, sorted by date ascending.
- Energy level tracker reads today's `MoodEntry.energyLevel`.
- Wellness recommendations are calculated from mood patterns over the past 7 days.
- Mood history list loads all `MoodEntry` records sorted by date descending.
- The FAB bottom sheet creates a new `MoodEntry` or updates today's existing entry.
- All data is stored locally on-device.

## 9. Motion

### Entry Animations

- App bar title fades in with opacity 0 → 1, 300ms spring easing.
- Content cards cascade with 80ms stagger delay. Each enters via `translateY(12px)` → `translateY(0)` with opacity 0 → 1, spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`), 450ms.
- FAB enters with scale 0 → 1, spring easing, 400ms, 200ms delay after page mount.

### Chart Animations

- Chart line draws left-to-right over 800ms via `stroke-dashoffset`.
- Fill area fades in with 400ms offset after line completes.
- Data points reveal sequentially left-to-right, 60ms per point, after line draw.

### Energy Level Bar

- Segments fill left-to-right with 60ms stagger, Lilac Pulse appearing via width animation from 0 to full, spring easing.

### Mood Logging Bottom Sheet

- Sheet slides up from bottom with spring overshoot, 400ms.
- Mood icons scale in with 40ms stagger, spring easing.
- On save: sheet dismisses with 180ms ease-out slide down.

### Page Transitions

- Forward navigation (push from mindfulness mood banner): content slides up 20px and fades in, 350ms spring.
- Back navigation (pop): content fades out, 180ms ease-out.
- Pull-to-refresh: Coral Bloom refresh indicator.

## 10. Accessibility

### Semantics Labels

- Screen: `Semantics(label: "Mood and Wellness")`.
- Today's mood card: `Semantics(label: "Today's mood: [mood label]")` or `Semantics(label: "Today's mood: not yet logged")`.
- Each mood icon: `Semantics(label: "Mood level [n]: [label]", button: true)`.
- Mood chart: `Semantics(label: "Mood trends chart for the past 14 days")`.
- Each chart data point: `Semantics(label: "Mood level [n] on [date]")`.
- Energy level tracker: `Semantics(label: "Energy level: [label]")` or `Semantics(label: "Energy level: not logged")`.
- Each energy segment: `Semantics(label: "Set energy level to [n]", button: true)`.
- Recommendations card: `Semantics(label: "Wellness recommendations")`.
- Each recommendation row: `Semantics(label: "[title]: [description]", button: true)`.
- Mood history entry: `Semantics(label: "Mood entry on [date]: [mood label], energy [level]")`.
- FAB: `Semantics(label: "Log mood", button: true)`.
- Bottom sheet save button: `Semantics(label: "Save mood entry", button: true)`.

### Focus Order

1. App bar title ("Mood & Wellness")
2. Today's mood card — mood icons left to right
3. Mood chart — chart region, data points
4. Energy level tracker — segments left to right
5. Wellness recommendations — rows top to bottom
6. Mood history list — entries top to bottom
7. FAB (last in focus order, anchored at bottom-right)

### Contrast Notes

- Ink Charcoal (#2A2A3A) on Cloud White (#FFFFFF): contrast ratio ~13.5:1 — exceeds AAA. Used for card titles, mood labels.
- Muted Quartz (#8B8B9C) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for dates, notes, metadata at Data/Caption scale.
- Cloud White text on Coral Bloom FAB: contrast ratio ~3.2:1 — meets AA for large text. FAB icon is 22px with 56dp tap target.
- Lilac Pulse (#8B7ED8) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for chart strokes, energy bar fills, recommendation icons.
- Field Green (#6DC48A) on Cloud White: contrast ratio ~2.9:1 — used for semantic mood indicator dots, not text.
- Fault Red (#E85C5C) on Cloud White: contrast ratio ~3.1:1 — used for low-mood indicator dots, not body text.
- All interactive elements maintain 44x44dp minimum touch targets.

## 11. Anti-Patterns

- No emojis for mood icons — use custom vector illustrations or Lucide icons with semantic coloring
- No pure black (#000000) anywhere — use Ink Charcoal (#2A2A3A) as darkest value
- No glass morphism or backdrop blur — opaque Cloud White cards on Lavender Mist canvas
- No circular loading spinners — use skeleton shimmer loaders matching card dimensions
- No hover-only interaction states — all interactions are tap-based
- No Inter, Poppins, Roboto, or Montserrat fonts — use Plus Jakarta Sans exclusively
- No linear easing on any animation — spring or ease-out only
- No gradient text on headings — flat color only
- No hard black drop-shadows — all shadows carry lilac tint per Pastel Elevation spec
- No `h-screen` — use `min-h-[100dvh]` for full-height sections
- No landscape layouts — portrait only, locked at app level
- No medical diagnostic language — mood tracking is for personal awareness, not clinical diagnosis
- No fabricated wellness statistics or claims
- No 3-column grids — single-column card layout for this screen
- No neon-saturated mood colors — mood indicators use the soft functional palette (Field Green, Caution Amber, Fault Red)
