# Screen Specification: Health Log

## 1. Screen Title

Health Log

## 2. Purpose

Central hub for tracking doctor visits, logging symptoms, and managing checkup reminders. Organizes health-related entries into three tabbed categories so the user can quickly find, add, and review medical interactions and symptoms throughout pregnancy.

## 3. Route

`/health-log`

## 4. Widget Name

`HealthLogScreen`

## 5. Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary Canvas | Lavender Mist (#EDE8F7) | Screen background behind tab content |
| Card Surface | Cloud White (#FFFFFF) | List item cards, empty-state cards |
| Primary Accent | Coral Bloom (#F28B8B) | FAB fill, active tab indicator |
| Coral Whisper | rgba(242, 139, 139, 0.12) | Active tab pill background |
| Secondary Accent | Lilac Pulse (#8B7ED8) | Tab bar labels (active), severity icons, date highlights |
| Lilac Whisper | rgba(139, 126, 216, 0.14) | Tab bar active indicator |
| Text Primary | Ink Charcoal (#2A2A3A) | Visit summaries, symptom names, reminder titles |
| Text Secondary | Muted Quartz (#8B8B9C) | Dates, doctor names, notes, severity labels |
| Chip Background | Chip Mist rgba(139, 126, 216, 0.08) | Severity chips, entry type chips |
| Divider | Ghost Divide rgba(42, 42, 58, 0.06) | Between list items |
| Success | Field Green (#6DC48A) | Completed reminder checkmark |
| Error | Fault Red (#E85C5C) | High-severity symptom indicator, delete swipe background |
| Warning | Caution Amber (#F4C84D) | Medium-severity symptom indicator |

### Typography

| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Screen title | Display (2rem) | 800 | "Health Log" in app bar |
| Section headers | Heading (1.5rem) | 700 | Tab labels when used as section titles |
| Card titles | Subheading (1.125rem) | 600 | Visit summary, symptom name, reminder title |
| Body text | Body (1rem) | 400 | Notes, doctor name, detailed descriptions |
| Metadata | Data (0.875rem) | 500 | Severity label, entry date, notification time |
| Helper text | Caption (0.8125rem) | 400 | Date strings, secondary metadata |
| Badge text | Micro (0.6875rem) | 700 | Tab badge counts, severity badges (uppercase) |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| Screen horizontal padding | 20dp (1.25rem) | Left/right content inset |
| Section gap | 24dp | Between tab bar and content list |
| Card internal padding | 20dp | Inside each list item card |
| List item spacing | 12dp | Between list item cards |
| Tab bar height | 48dp | Tab bar with labels |
| FAB bottom offset | 16dp | Above safe-area-inset-bottom |

### Corner Radius

| Token | Value | Usage |
|-------|-------|-------|
| List item cards | 24dp (1.5rem) | Doctor visit, symptom, reminder cards |
| Severity chips | 9999px | Severity indicator pills |
| FAB | 9999px | Circular floating action button |
| Tab indicator | 9999px | Active tab pill indicator |

### Elevation

| Token | Shadow | Usage |
|-------|--------|-------|
| Standard | 0 4px 20px rgba(139, 126, 216, 0.12) | List item cards |
| Subtle | 0 2px 8px rgba(139, 126, 216, 0.08) | Card press state, tab bar |
| FAB | 0 8px 32px rgba(139, 126, 216, 0.14) | Floating action button |

## 6. Layout Rules

### Scaffold

- **AppBar:** `SliverAppBar` with title "Health Log" in Display scale, Ink Charcoal. Pinned (does not collapse). Cloud White background. No back button — reached via tab navigation or push from home.
- **Body:** `DefaultTabController` wrapping a `Column` containing a `TabBar` and `TabBarView`. Each tab holds a `CustomScrollView` with a `SliverList` on Lavender Mist canvas.
- **BottomNavigationBar:** Visible. Health tab active (via TabBar sub-navigation within the Health tab).
- **FAB:** `FloatingActionButton` — circular, Coral Bloom fill, Cloud White `plus` icon (Lucide, 22px). 56dp diameter. Positioned bottom-right, 16dp above safe-area-inset-bottom. Tap opens entry type selection bottom sheet.

### Content Width

Full viewport width with 20dp horizontal padding. No max-width wrapper. Cards fill available width.

### Vertical Spacing

Tab bar sits directly below the app bar. Tab content starts with 24dp top padding. List items separated by 12dp. Content scrolls independently within each tab. Bottom padding clears the FAB (72dp) plus safe-area-inset-bottom.

## 7. Sections

### 7.1 Tab Bar

- **Description:** Three-tab navigation for filtering health log entries by type.
- **Widget type:** `TabBar` inside `DefaultTabController(length: 3)`.
- **Container:** Full width, sits below the pinned app bar. Cloud White background with subtle bottom shadow.
- **Data requirements:** None (static labels).
- **Content:**
  - Tab 1: "Doctor Visits" — Lucide `stethoscope` icon (18px) + label in Data scale.
  - Tab 2: "Symptoms" — Lucide `thermometer` icon (18px) + label in Data scale.
  - Tab 3: "Reminders" — Lucide `bell` icon (18px) + label in Data scale.
  - Active tab: Lilac Pulse text, Coral Whisper pill background indicator.
  - Inactive tab: Muted Quartz text, no background.
  - Tab indicator: pill-shaped (9999px radius), Coral Whisper fill beneath active label.
- **Interactive elements:** Tap tab to switch tab content. Swipe on `TabBarView` to navigate between tabs.

### 7.2 Doctor Visits List

- **Description:** Chronological list of doctor visit notes with date, doctor name, and summary.
- **Widget type:** `SliverList` of Cloud White cards inside a `CustomScrollView`.
- **Container:** Each card has 24dp border-radius, standard elevation, 20dp internal padding. Full width within horizontal padding.
- **Data requirements:** `DoctorVisit` entities — `date`, `doctorName`, `summary`, `notes`.
- **Content:**
  - Each card: a `Column` containing:
    - Date: Caption scale, Muted Quartz, top-right or top of card.
    - Doctor name: Data scale, Lilac Pulse, weight 500. Omitted if null.
    - Summary: Subheading scale, Ink Charcoal, weight 600.
    - Notes preview: Body scale, Ink Charcoal, max 2 lines with ellipsis overflow. Omitted if null.
  - Ghost Divide between cards (via 12dp gap on Lavender Mist canvas).
  - Empty state: centered illustration with "No doctor visits yet" in Body scale, Muted Quartz, and a ghost-style "Add Visit" button.
- **Interactive elements:**
  - Tap card → push to visit detail/edit screen.
  - Swipe card left → reveal Fault Red delete zone with Lucide `trash-2` icon, triggers confirmation dialog.

### 7.3 Symptoms List

- **Description:** Logged symptoms with date, type, severity indicator, and optional notes.
- **Widget type:** `SliverList` of Cloud White cards.
- **Container:** Each card has 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** `SymptomEntry` entities — `date`, `type`, `severity`, `notes`.
- **Content:**
  - Each card: a `Row` + `Column` layout:
    - Left: severity indicator dot (12dp circle) — Field Green (#6DC48A) for severity 1 (mild), Caution Amber (#F4C84D) for severity 2 (moderate), Fault Red (#E85C5C) for severity 3 (severe).
    - Right `Column`:
      - Symptom type: Subheading scale, Ink Charcoal, weight 600.
      - Severity label: Data scale, color matching the severity dot ("Mild" / "Moderate" / "Severe").
      - Date: Caption scale, Muted Quartz.
      - Notes preview: Body scale, Ink Charcoal, max 2 lines. Omitted if null.
  - Empty state: centered illustration with "No symptoms logged" in Body scale, Muted Quartz.
- **Interactive elements:**
  - Tap card → push to symptom detail/edit screen.
  - Swipe card left → delete with confirmation dialog.

### 7.4 Reminders List

- **Description:** Upcoming checkups and scheduled reminders with completion toggle.
- **Widget type:** `SliverList` of Cloud White cards.
- **Container:** Each card has 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** `Reminder` entities — `date`, `title`, `isDone`.
- **Content:**
  - Each card: a `Row` layout:
    - Left: circular checkbox (24dp) — unchecked: Ghost Divide border, no fill. Checked: Field Green fill with Cloud White `check` icon.
    - Center `Column`:
      - Title: Subheading scale, Ink Charcoal (or Muted Quartz with line-through if `isDone`).
      - Date: Caption scale, Muted Quartz.
    - Right: Lucide `chevron-right` icon (18px, Muted Quartz) indicating navigation.
  - Completed reminders move to the bottom of the list with reduced opacity (60%).
  - Empty state: centered illustration with "No reminders set" in Body scale, Muted Quartz.
- **Interactive elements:**
  - Tap checkbox → toggle `isDone` state.
  - Tap card body → push to reminder detail/edit screen.
  - Swipe card left → delete with confirmation dialog.

### 7.5 FAB Bottom Sheet (Entry Type Selection)

- **Description:** Bottom sheet presented when the FAB is tapped, allowing the user to choose which type of entry to create.
- **Widget type:** Bottom sheet (`showModalBottomSheet`) with a `Column` of option rows.
- **Container:** Cloud White fill, 28dp top border-radius, drag handle (40px wide, 4px tall, Chip Mist), Dim Veil backdrop.
- **Data requirements:** None (static options).
- **Content:**
  - Three option rows, each a `ListTile`-style row:
    - "Log Doctor Visit" — Lucide `stethoscope` icon (22px, Lilac Pulse) + Subheading scale text.
    - "Log Symptom" — Lucide `thermometer` icon (22px, Lilac Pulse) + Subheading scale text.
    - "Add Reminder" — Lucide `bell` icon (22px, Lilac Pulse) + Subheading scale text.
  - Ghost Divide between options.
  - 44dp minimum tap target per option.
- **Interactive elements:** Tap option → dismiss sheet and navigate to the corresponding entry form (push or inline bottom sheet).

## 8. Data

### Entities

**DoctorVisit**
- `id`: String — unique identifier
- `date`: DateTime — visit date
- `doctorName`: String? — name of the doctor (optional)
- `summary`: String — brief visit summary
- `notes`: String? — additional notes (optional)

**SymptomEntry**
- `id`: String — unique identifier
- `date`: DateTime — date symptom was logged
- `type`: SymptomType — symptom category (e.g., nausea, headache, fatigue, cramping)
- `severity`: int (1–3) — 1 = mild, 2 = moderate, 3 = severe
- `notes`: String? — additional context (optional)

**Reminder**
- `id`: String — unique identifier
- `date`: DateTime — scheduled date/time
- `title`: String — reminder description
- `isDone`: bool — completion state

### Screen Data Flow

- All three entity types are loaded from local on-device storage.
- Each tab displays a filtered, date-sorted list of its entity type (most recent first).
- The FAB triggers creation of new entries; each entry type has its own input form.
- Swipe-to-delete removes entries after confirmation dialog approval.
- Reminder toggle updates `isDone` state immediately with optimistic UI update.

## 9. Motion

### Entry Animations

- Tab bar fades in with opacity 0 → 1, 300ms spring easing.
- List items in the active tab cascade with 80ms stagger delay. Each enters via `translateY(12px)` → `translateY(0)` with opacity 0 → 1, spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`), 450ms.
- FAB enters with scale 0 → 1, spring easing, 400ms, 200ms delay after page mount.

### Tab Switch

- `TabBarView` swipe uses default Material page-turn physics.
- When switching tabs, the new list cascades in with the same stagger reveal (80ms per card).

### Swipe-to-Delete

- Card slides left to reveal the Fault Red delete zone. Spring physics on release — snaps back or triggers delete.
- On delete confirmation: card shrinks vertically to 0 height with 300ms ease-out, remaining cards slide up to fill gap.

### Reminder Toggle

- Checkbox fills with Field Green via scale animation (0 → 1), 250ms spring.
- Title text color crossfades to Muted Quartz and line-through appears with 200ms transition.

### Page Transitions

- Forward navigation (push from home "Next Checkup" card): content slides up 20px and fades in, 350ms spring.
- Back navigation (pop): content fades out, 180ms ease-out.

## 10. Accessibility

### Semantics Labels

- Screen: `Semantics(label: "Health Log")`.
- Tab bar: `Semantics(label: "Health log categories")`.
- Doctor Visits tab: `Semantics(label: "Doctor Visits tab")`.
- Symptoms tab: `Semantics(label: "Symptoms tab")`.
- Reminders tab: `Semantics(label: "Reminders tab")`.
- FAB: `Semantics(label: "Add new health log entry", button: true)`.
- Each doctor visit card: `Semantics(label: "Doctor visit on [date]: [summary]")`.
- Each symptom card: `Semantics(label: "[type] symptom, severity [level], logged [date]")`.
- Each reminder card: `Semantics(label: "Reminder: [title], due [date], [done/pending]")`.
- Reminder checkbox: `Semantics(label: "Mark [title] as [done/pending]", button: true)`.
- Delete swipe action: `Semantics(label: "Delete [entry type]", button: true)`.
- Bottom sheet options: `Semantics(label: "Log Doctor Visit", button: true)`, etc.

### Focus Order

1. App bar title ("Health Log")
2. Tab bar — Doctor Visits, Symptoms, Reminders (left to right)
3. Active tab content — list items top to bottom, each item's interactive elements
4. FAB (last in focus order, anchored at bottom-right)

### Contrast Notes

- Ink Charcoal (#2A2A3A) on Cloud White (#FFFFFF): contrast ratio ~13.5:1 — exceeds AAA. Used for summaries, symptom names, reminder titles.
- Muted Quartz (#8B8B9C) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for dates and metadata at Data/Caption scale.
- Cloud White text on Coral Bloom FAB: contrast ratio ~3.2:1 — meets AA for large text. FAB icon is 22px with 56dp tap target.
- Lilac Pulse (#8B7ED8) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for active tab labels and doctor name.
- Field Green (#6DC48A) on Cloud White: contrast ratio ~2.9:1 — used only for semantic indicator dots and filled checkboxes, not text.
- Fault Red (#E85C5C) on Cloud White: contrast ratio ~3.1:1 — used for severity indicators and delete zone, not body text.
- All interactive elements maintain 44x44dp minimum touch targets.

## 11. Anti-Patterns

- No emojis for tab icons or severity indicators — use Lucide icons and colored dots
- No pure black (#000000) anywhere — use Ink Charcoal (#2A2A3A) as darkest value
- No glass morphism or backdrop blur — opaque Cloud White cards on Lavender Mist canvas
- No circular loading spinners — use skeleton shimmer loaders matching list item card dimensions
- No floating detached tab bar — bottom nav is flush with bottom, tab bar is inline below app bar
- No hover-only interaction states — all interactions are tap-based
- No Inter, Poppins, Roboto, or Montserrat fonts — use Plus Jakarta Sans exclusively
- No linear easing on any animation — spring or ease-out only
- No gradient text on headings — flat color only
- No hard black drop-shadows — all shadows carry lilac tint per Pastel Elevation spec
- No `h-screen` — use `min-h-[100dvh]` for full-height sections
- No landscape layouts — portrait only, locked at app level
- No medical diagnostic language — this is a tracking log, not a diagnostic tool
- No fabricated medical statistics or health claims
- No 3-column grids — list layout is single-column for this screen
