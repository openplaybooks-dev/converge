# Screen Specification: Cycle Tracking

## 1. Screen Title

Cycle Tracking

## 2. Purpose

Track menstrual cycles, view ovulation predictions, and highlight fertile windows. Provides a calendar-based visualization of cycle history alongside summary statistics and the ability to log and annotate individual cycle entries. Serves as the primary reproductive-health tracking surface in the app.

## 3. Route

`/cycle`

## 4. Widget Name

`CycleTrackingScreen`

## 5. Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary Canvas | Lavender Mist (#EDE8F7) | Screen background |
| Card Surface | Cloud White (#FFFFFF) | All content cards |
| Primary Accent | Coral Bloom (#F28B8B) | FAB, period-day markers, active states |
| Coral Whisper | rgba(242, 139, 139, 0.12) | Fertile window highlight fill |
| Secondary Accent | Lilac Pulse (#8B7ED8) | Ovulation marker, chart strokes |
| Lilac Whisper | rgba(139, 126, 216, 0.14) | Selected day highlight |
| Text Primary | Ink Charcoal (#2A2A3A) | Headings, day numbers |
| Text Secondary | Muted Quartz (#8B8B9C) | Labels, metadata, inactive days |
| Divider | Ghost Divide rgba(42, 42, 58, 0.06) | List separators in cycle history |
| Success | Field Green (#6DC48A) | Regular cycle indicator |
| Warning | Caution Amber (#F4C84D) | Irregular cycle flag |
| Error | Fault Red (#E85C5C) | Missed period alert |

### Typography

| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Screen title | Display (2rem) | 800 | "Cycle Tracker" in app bar |
| Section headers | Heading (1.5rem) | 700 | "Current Cycle", "History" |
| Card titles | Subheading (1.125rem) | 600 | Summary card labels |
| Body text | Body (1rem) | 400 | Notes, descriptions |
| Metadata | Data (0.875rem) | 500 | Cycle length, dates |
| Helper text | Caption (0.8125rem) | 400 | Day-of-week labels, footnotes |
| Calendar day numbers | Data (0.875rem) | 500 | Day grid numbers |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| Screen horizontal padding | 20dp (1.25rem) | Left/right content inset |
| Section gap | 24dp | Between calendar, summary card, history list |
| Card internal padding | 20dp | Inside all content cards |
| Calendar cell gap | 4dp | Between day cells in grid |
| List item spacing | 12dp | Between cycle history entries |

### Corner Radius

| Token | Value | Usage |
|-------|-------|-------|
| Content cards | 24dp (1.5rem) | Calendar card, summary card |
| Calendar day cells | 9999px | Circular day indicators |
| FAB | 9999px | Fully rounded |
| Chips | 9999px | Irregular flag chip |

### Elevation

| Token | Shadow | Usage |
|-------|--------|-------|
| Standard | 0 4px 20px rgba(139, 126, 216, 0.12) | Calendar card, summary card |
| FAB | 0 4px 20px rgba(139, 126, 216, 0.12) | Floating action button |
| Bottom Nav | 0 -4px 20px rgba(139, 126, 216, 0.08) | Tab bar |

## 6. Layout Rules

### Scaffold

- **AppBar:** `SliverAppBar` with title "Cycle Tracker", pinned. Back button if pushed; otherwise hidden when reached via tab. Title in Display scale, Ink Charcoal.
- **Body:** `CustomScrollView` containing sliver-based sections on Lavender Mist canvas.
- **BottomNavigationBar:** Visible. Cycle tab active (if tab-navigated) or Health tab active (if push-navigated from Health tab). Cloud White background, Coral Bloom active icon/label on Coral Whisper pill, Muted Quartz inactive.
- **FAB:** `FloatingActionButton` in Coral Bloom for quick-logging a new cycle start. Lucide `plus` icon at 22px, Cloud White. Positioned bottom-right, 20dp inset from edges, above bottom nav z-index.

### Content Width

Full viewport width with 20dp horizontal padding. No max-width wrapper. Cards fill available width.

### Vertical Spacing

Content starts 0.75rem below status bar safe-area inset. Sections separated by 24dp gaps. Content ends 0.75rem above tab bar.

## 7. Sections

### 7.1 Calendar View

- **Description:** Monthly calendar grid showing color-coded cycle days, ovulation markers, and fertile window highlights. Month/year header with left/right chevron navigation.
- **Widget type:** `Column` containing a month header row and a 7-column `GridView` (fixed cross-axis count of 7).
- **Container:** Cloud White card, 24dp border-radius, standard elevation shadow, 20dp internal padding.
- **Data requirements:** `List<CycleEntry>` for the displayed month. Calculated ovulation dates and fertile windows derived from cycle data.
- **Visual encoding:**
  - Period days: Coral Bloom filled circle behind day number (Cloud White text)
  - Fertile window days: Coral Whisper filled circle (Ink Charcoal text)
  - Ovulation day: Lilac Pulse filled circle (Cloud White text)
  - Today (non-cycle): Lilac Whisper ring outline (Ink Charcoal text)
  - Other days: No fill (Ink Charcoal text)
  - Days outside current month: Muted Quartz text, no interaction
- **Interactive elements:**
  - Tap any day in current month → opens cycle entry bottom sheet for that date
  - Long press day → add note to that date
  - Swipe left/right on calendar → navigate months
  - Left/right chevrons in header → navigate months

### 7.2 Current Cycle Summary Card

- **Description:** Key statistics for the active cycle: cycle length, days until next predicted period, predicted ovulation date, and current cycle day.
- **Widget type:** Cloud White card containing a `Column` of stat rows.
- **Container:** 24dp border-radius, standard elevation, 20dp padding.
- **Data requirements:** Active `CycleEntry` (most recent with no `endDate`), calculated next period date, calculated ovulation date, average cycle length.
- **Stat layout:** Each stat rendered as a row — label (Caption scale, Muted Quartz) on the left, value (Subheading scale, Ink Charcoal) on the right. Ghost Divide between rows.
- **Stats displayed:**
  - Cycle Day: current day number (e.g., "Day 14")
  - Cycle Length: average length in days (e.g., "28 days")
  - Next Period: predicted date (e.g., "May 3")
  - Ovulation: predicted date (e.g., "Apr 25")
- **Interactive elements:** Tap card → no action (informational only)

### 7.3 Cycle History List

- **Description:** Scrollable list of previous completed cycles with start/end dates, duration, and optional notes.
- **Widget type:** `SliverList` with `Ghost Divide` separators between items.
- **Container:** Cloud White card wrapping the list, 24dp border-radius, standard elevation, 20dp padding.
- **Data requirements:** `List<CycleEntry>` sorted by `startDate` descending, limited to entries where `endDate` is not null.
- **Item layout:** Each item is a row — left side shows start-end date range (Data scale, Ink Charcoal) and duration in days (Caption scale, Muted Quartz); right side shows an irregular flag chip (Caution Amber background, Caption scale) if `isIrregular` is true, and a trailing chevron-right icon (Muted Quartz, 18px).
- **Interactive elements:**
  - Tap item → push to cycle detail view
  - Swipe item left → reveal delete action (Fault Red background, confirm via dialog)

### 7.4 Irregular Cycle Notes Card

- **Description:** Informational card for flagging and annotating irregular cycles. Shows a count of irregular cycles and provides context.
- **Widget type:** Cloud White card with `Column` layout.
- **Container:** 24dp border-radius, standard elevation, 20dp padding.
- **Data requirements:** Count of `CycleEntry` where `isIrregular == true`. Latest irregular cycle notes.
- **Content:** Heading "Irregular Cycles" (Subheading scale), count badge (Caution Amber chip), brief explanation text (Body scale, Muted Quartz), and latest notes preview (Caption scale).
- **Interactive elements:** Tap → expand to show all irregular cycle entries with notes.

## 8. Data

### Entities

**CycleEntry** (primary)
- `id`: String — unique identifier
- `startDate`: DateTime — first day of period
- `endDate`: DateTime? — last day of period (null if current/ongoing)
- `isIrregular`: bool — manually flagged by user
- `notes`: String? — optional user annotation

**PregnancyProfile** (context)
- `userName`: String — for display in greeting if needed
- `lastMenstrualPeriod`: DateTime — baseline for calculations

### Calculated Fields
- **Cycle length:** `endDate - startDate` in days per entry; average across all completed entries
- **Ovulation prediction:** `startDate + averageCycleLength - 14` days (standard luteal phase estimate)
- **Fertile window:** Ovulation date minus 5 days through ovulation date plus 1 day
- **Next period prediction:** Most recent `startDate + averageCycleLength`
- **Current cycle day:** `today - mostRecentStartDate + 1`

## 9. Motion

### Entry Animations
- Calendar card enters via `translateY(12px)` → `translateY(0)` with opacity 0 → 1, spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`), 450ms.
- Summary card enters with 80ms stagger delay after calendar card, same spring animation.
- History list items cascade with 80ms stagger between each item, same spring animation.

### Calendar Interactions
- Month navigation (swipe or chevron tap): outgoing month slides out with exit easing (`cubic-bezier(0.25, 0, 0, 1)`, 180ms), incoming month slides in from the navigation direction with spring easing, 350ms.
- Day tap: tapped day cell scales from `1.0` to `0.95` then back to `1.0` (spring, 200ms) while bottom sheet slides up (spring overshoot, 400ms).

### Data Updates
- When a new cycle entry is logged, the affected calendar day cells crossfade to their new color state over 300ms.
- Stat values in the summary card crossfade (not count-up) on subsequent data changes.

### FAB
- FAB enters on screen mount with spring scale from `0.0` to `1.0`, 400ms, 200ms delay after last content card.

## 10. Accessibility

### Semantics Labels
- Calendar grid: `Semantics(label: "Cycle calendar for [Month Year]")` wrapping the grid.
- Each calendar day: `Semantics(label: "[Day number], [status: period day / fertile window / ovulation / no data]", button: true)`.
- Summary card stats: Each stat row has `Semantics(label: "[Label]: [Value]")`.
- History list items: `Semantics(label: "Cycle from [start] to [end], [duration] days, [irregular/regular]")`.
- FAB: `Semantics(label: "Log new cycle start", button: true)`.
- Irregular chip: `Semantics(label: "Irregular cycle")`.

### Focus Order
1. App bar title and back button (if present)
2. Calendar month navigation (left chevron, month label, right chevron)
3. Calendar day cells (row by row, left to right)
4. Current cycle summary card (stat rows top to bottom)
5. Cycle history list (items top to bottom)
6. Irregular cycle notes card
7. FAB
8. Bottom navigation tabs

### Contrast Notes
- Coral Bloom (#F28B8B) on Cloud White (#FFFFFF): contrast ratio ~3.2:1 — meets AA for large text. Day numbers on Coral Bloom circles use Cloud White text for sufficient contrast.
- Lilac Pulse (#8B7ED8) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Ovulation day uses Cloud White text.
- Ink Charcoal (#2A2A3A) on Cloud White: contrast ratio ~13.5:1 — exceeds AAA.
- Muted Quartz (#8B8B9C) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text only. Used only for secondary/metadata text at Data scale or larger.
- All interactive elements maintain 44x44dp minimum touch targets.

## 11. Anti-Patterns

- No emojis for cycle status indicators — use color-coded circles and chips per the design system
- No pure black (#000000) anywhere — use Ink Charcoal (#2A2A3A) as darkest value
- No glass morphism or backdrop blur on any surface — opaque Cloud White cards on Lavender Mist canvas
- No circular loading spinners — use skeleton shimmer loaders matching card dimensions
- No 3-column grids — calendar uses 7-column (days of week) which is the sole exception as a calendar convention
- No floating detached tab bar — bottom nav is flush, opaque, grounded
- No hover-only interaction states — all interactions are tap-based
- No generic placeholder names — use contextual demo names if needed ("Mira", "Nora")
- No fabricated medical statistics — ovulation and fertile window predictions are clearly labeled as estimates
- No medical diagnostic language — this is a tracker, not a diagnostic tool. Avoid "diagnose", "treat", "cure"
- No Inter, Poppins, Roboto, or Montserrat fonts — use Plus Jakarta Sans exclusively
- No linear easing on any animation — spring or ease-out only
- No gradient text on headings — flat color only
- No hard black drop-shadows — all shadows carry lilac tint per Pastel Elevation spec
