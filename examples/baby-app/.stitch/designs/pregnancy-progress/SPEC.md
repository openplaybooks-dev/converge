# Screen Specification: Pregnancy Progress

## 1. Screen Title

Pregnancy Progress

## 2. Purpose

Display week-by-week pregnancy updates including baby development milestones, body changes, self-care checklists, safe exercise guides, and a due date countdown. Serves as the primary informational surface for expecting mothers to understand what is happening at each stage of pregnancy, combining educational content with actionable daily self-care tasks.

## 3. Route

`/progress`

## 4. Widget Name

`PregnancyProgressScreen`

## 5. Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary Canvas | Lavender Mist (#EDE8F7) | Screen background |
| Alternate Canvas | Blush Veil (#FDEEEE) | Week hero background band in pregnancy mode |
| Card Surface | Cloud White (#FFFFFF) | All content cards |
| Primary Accent | Coral Bloom (#F28B8B) | Week number highlight, checklist completion, progress bar fill |
| Coral Whisper | rgba(242, 139, 139, 0.12) | Active tab pill, soft hero overlays |
| Secondary Accent | Lilac Pulse (#8B7ED8) | Development milestone icons, due date countdown accent |
| Lilac Whisper | rgba(139, 126, 216, 0.14) | Progress bar background track |
| Text Primary | Ink Charcoal (#2A2A3A) | Headings, body text, week number |
| Text Secondary | Muted Quartz (#8B8B9C) | Labels, metadata, trimester indicator |
| Divider | Ghost Divide rgba(42, 42, 58, 0.06) | Separators between checklist items and exercise rows |
| Chip Background | Chip Mist rgba(139, 126, 216, 0.08) | Trimester chips, exercise category tags |
| Success | Field Green (#6DC48A) | Completed checklist items |
| Warning | Caution Amber (#F4C84D) | Upcoming due date warning |
| Error | Fault Red (#E85C5C) | Overdue indicator |

### Typography

| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Screen title | Display (2rem) | 800 | "Week {n}" in collapsing app bar |
| Week number | Stat (2.25rem) | 800 | Large week number in hero |
| Section headers | Heading (1.5rem) | 700 | "Body Changes", "Baby Development", "Self-Care" |
| Card titles | Subheading (1.125rem) | 600 | Card headings, exercise names |
| Body text | Body (1rem) | 400 | Development descriptions, body change details |
| Metadata | Data (0.875rem) | 500 | Trimester label, size comparison text, days remaining |
| Helper text | Caption (0.8125rem) | 400 | Due date, checklist subtitles |
| Badges | Micro (0.6875rem) | 700 | Trimester badge, exercise difficulty tags |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| Screen horizontal padding | 20dp (1.25rem) | Left/right content inset |
| Section gap | 24dp | Between hero, body changes, development, checklist, exercise, countdown cards |
| Card internal padding | 20dp | Inside all content cards |
| Hero internal padding | 32dp | Extra padding inside week hero card |
| Checklist item spacing | 12dp | Between self-care checklist items |
| Exercise card gap | 12dp | Between exercise guide items |

### Corner Radius

| Token | Value | Usage |
|-------|-------|-------|
| Hero card | 32dp (2rem) | Week hero illustration card |
| Content cards | 24dp (1.5rem) | Body changes, development, checklist, exercise, countdown |
| Progress bar | 9999px | Fully rounded due date progress bar |
| Trimester chip | 9999px | Fully rounded trimester badge |
| Checklist checkbox | 8dp | Rounded checkbox corners |

### Elevation

| Token | Shadow | Usage |
|-------|--------|-------|
| Prominent | 0 8px 32px rgba(139, 126, 216, 0.14) | Week hero card |
| Standard | 0 4px 20px rgba(139, 126, 216, 0.12) | Body changes, development, checklist, exercise, countdown cards |
| Bottom Nav | 0 -4px 20px rgba(139, 126, 216, 0.08) | Tab bar |

## 6. Layout Rules

### Scaffold

- **AppBar:** `SliverAppBar(expandedHeight: 280)` with hero illustration in `flexibleSpace`. Title "Week {n}" in Display scale, Ink Charcoal, shown when collapsed. Background transitions from Blush Veil (expanded) to Cloud White (collapsed).
- **Body:** `CustomScrollView` containing sliver-based sections on Lavender Mist canvas.
- **BottomNavigationBar:** Visible. Progress tab active. Cloud White background, Coral Bloom active icon/label on Coral Whisper pill, Muted Quartz inactive.
- **FAB:** None.

### Content Width

Full viewport width with 20dp horizontal padding. No max-width wrapper. Cards fill available width.

### Vertical Spacing

Content starts 0.75rem below status bar safe-area inset. Sections separated by 24dp gaps. Content ends 0.75rem above tab bar.

## 7. Sections

### 7.1 Week Hero

- **Description:** Collapsing header card with baby illustration and size comparison using a fruit/vegetable analogy. Shows current pregnancy week prominently with a trimester indicator.
- **Widget type:** `SliverAppBar` flexibleSpace containing a `Column` with centered illustration, week number, and size comparison text.
- **Container:** Part of the SliverAppBar expanded space. When scrolled into a standalone card context, uses 32dp border-radius, prominent elevation, 32dp internal padding.
- **Data requirements:** `PregnancyProfile.currentWeek`, week-specific illustration asset, baby size comparison string (e.g., "Your baby is the size of a mango"), `PregnancyProfile.currentTrimester`.
- **Content:**
  - Centered illustration occupying ~70% of card width — custom vector art of fetal development for the current week
  - Week number: "Week {n}" in Stat scale, Coral Bloom
  - Size comparison: fruit/vegetable analogy in Data scale, Muted Quartz
  - Trimester badge: "Trimester {n}" in Micro scale, uppercase, Lilac Pulse text on Chip Mist pill
- **Interactive elements:**
  - Swipe left/right → navigate to adjacent weeks via `PageView` within the hero area
  - Illustration has gentle breathing animation: 4s cycle, scale 1.0 → 1.015 → 1.0

### 7.2 Body Changes Card

- **Description:** What is happening with the mother's body this week. Provides reassuring, informational content about physical changes.
- **Widget type:** Cloud White card containing a `Column` with heading and body text paragraphs.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** Week-specific body changes content keyed to `PregnancyProfile.currentWeek`.
- **Content:**
  - Heading: "Body Changes" (Heading scale, Ink Charcoal) with a Lilac Pulse icon (Lucide `heart-pulse`, 22px) left of heading
  - Body paragraphs: 2–4 paragraphs describing physical changes (Body scale, Ink Charcoal)
  - Each change point prefixed with a small Coral Bloom dot indicator
- **Interactive elements:** None — informational only.

### 7.3 Baby Development Card

- **Description:** What is developing with the baby this week — organs, senses, movement capabilities.
- **Widget type:** Cloud White card containing a `Column` with heading and a list of development milestones.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** Week-specific baby development content keyed to `PregnancyProfile.currentWeek`.
- **Content:**
  - Heading: "Baby Development" (Heading scale, Ink Charcoal) with a Lilac Pulse icon (Lucide `baby`, 22px) left of heading
  - Milestone list: Each milestone is a row with a Lilac Pulse icon (16px) and description text (Body scale, Ink Charcoal). Ghost Divide between items.
  - Examples: organ formation, sensory development, movement, size/weight estimates
- **Interactive elements:** None — informational only.

### 7.4 Self-Care Checklist

- **Description:** Daily self-care reminders that the user can check off: hydration, kegel exercises, stretching, prenatal vitamins.
- **Widget type:** Cloud White card containing a `Column` with heading and a list of checkable items.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** Checklist items (static per trimester), completion state per item per day (stored locally).
- **Content:**
  - Heading: "Self-Care" (Heading scale, Ink Charcoal) with completion count in Data scale, Muted Quartz (e.g., "3/5 complete")
  - Each item: checkbox (Field Green when checked, Ghost Divide border when unchecked) + item text (Body scale, Ink Charcoal). Completed items show text with reduced opacity (60%).
  - Items include: "Drink 8 glasses of water", "Take prenatal vitamins", "Kegel exercises", "10 min stretching", "Rest and relax"
- **Interactive elements:**
  - Tap checkbox or item row → toggle completion state
  - Completed items animate with a subtle spring scale 1.0 → 0.95 → 1.0

### 7.5 Exercise Guide Card

- **Description:** Safe exercises for the current trimester with clear instructions and safety notes.
- **Widget type:** Cloud White card containing a `Column` with heading and a vertical list of exercise items.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** Exercise guides filtered by `PregnancyProfile.currentTrimester`. Each exercise has name, description, safety level.
- **Content:**
  - Heading: "Safe Exercises" (Heading scale, Ink Charcoal) with trimester context in Data scale, Muted Quartz (e.g., "For Trimester 2")
  - Each exercise: icon (Lucide, 20px, Lilac Pulse) + name (Subheading scale, Ink Charcoal) + brief description (Caption scale, Muted Quartz) + trailing chevron-right (Muted Quartz, 18px). Ghost Divide between items.
  - Examples: walking, swimming, prenatal yoga, pelvic tilts
- **Interactive elements:**
  - Tap exercise item → push to exercise detail screen (`/mindfulness/exercise/:id`)

### 7.6 Due Date Countdown

- **Description:** Visual countdown to the estimated delivery date with days remaining, a progress bar, and the target date.
- **Widget type:** Cloud White card containing a `Column` with heading, progress visualization, and date display.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** `PregnancyProfile.dueDate`, `PregnancyProfile.currentWeek`, calculated days remaining.
- **Content:**
  - Heading: "Due Date" (Heading scale, Ink Charcoal)
  - Days remaining: large number in Stat scale, Coral Bloom, followed by "days to go" in Data scale, Muted Quartz
  - Progress bar: horizontal bar showing pregnancy progress (weeks elapsed / 40 weeks). Track: Lilac Whisper. Fill: Coral Bloom. Height 8px, fully rounded (9999px radius).
  - Estimated date: formatted due date in Subheading scale, Ink Charcoal
  - Week progress label: "{current}/40 weeks" in Caption scale, Muted Quartz
- **Interactive elements:**
  - Tap due date card → push to due date settings (set or recalculate from LMP) in `/settings`

## 8. Data

### Entities

**PregnancyProfile** (primary context)
- `dueDate`: DateTime — estimated delivery date
- `lastMenstrualPeriod`: DateTime — date of last menstrual period
- `currentWeek`: int — current pregnancy week (calculated from LMP or due date)
- `currentTrimester`: int — current trimester (1, 2, or 3, calculated from week)
- `userName`: String — user display name
- `height`: double — user height

**WeekContent** (reference data, keyed by week number)
- `weekNumber`: int — pregnancy week (1–42)
- `babySize`: String — fruit/vegetable size comparison
- `bodyChanges`: List\<String\> — body change descriptions for this week
- `babyDevelopment`: List\<String\> — development milestones for this week
- `illustration`: String — asset path for week-specific baby illustration

**SelfCareItem** (per-day state)
- `id`: String — unique identifier
- `title`: String — checklist item text
- `isCompleted`: bool — completion state for today
- `trimester`: int — which trimester this item applies to

**Exercise** (reference data)
- `id`: String — unique identifier
- `name`: String — exercise name
- `category`: ExerciseCategory — breathing, stretching, meditation
- `trimester`: List\<int\> — which trimesters this exercise is safe for
- `description`: String — brief description
- `steps`: List\<String\> — step-by-step instructions

### Calculated Fields

- **Days remaining:** `dueDate.difference(today).inDays`
- **Progress fraction:** `currentWeek / 40`
- **Trimester:** Week 1–13 → Trimester 1, Week 14–27 → Trimester 2, Week 28–42 → Trimester 3
- **Checklist completion:** count of completed items / total items for today

## 9. Motion

### Entry Animations

- Week hero enters via the SliverAppBar expansion. Illustration fades in with opacity 0 → 1 over 450ms spring easing.
- Hero illustration has perpetual breathing animation: 4s cycle, `scale(1.0)` → `scale(1.015)` → `scale(1.0)`.
- Body Changes card enters via `translateY(12px)` → `translateY(0)` with opacity 0 → 1, spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`), 450ms.
- Baby Development card enters with 80ms stagger delay after Body Changes card, same spring animation.
- Self-Care Checklist enters with 80ms stagger after Development card. Checklist items cascade with 60ms stagger between items.
- Exercise Guide card enters with 80ms stagger after Checklist card.
- Due Date Countdown enters with 80ms stagger after Exercise card. Days remaining counts up from 0 to target value over 800ms ease-out. Progress bar fills from 0% to current progress over 700ms spring easing.

### Week Navigation

- Swipe left on hero → current week content slides out left with exit easing (180ms), new week content slides in from right with spring easing (350ms).
- Swipe right on hero → reverse direction. Content below the hero crossfades to the new week's content over 300ms.

### Checklist Interactions

- Toggling a checklist item: checkbox fills with Field Green via spring scale animation (250ms). Completed item text opacity transitions to 60% over 200ms.
- Completion count updates with a brief number crossfade (150ms).

### Page Transitions

- Forward navigation (tap exercise → detail): content slides up 20px and fades in, 350ms spring.
- Back navigation: content fades out, 180ms ease-out.

## 10. Accessibility

### Semantics Labels

- Week hero: `Semantics(label: "Pregnancy week [n], trimester [t]. Baby is the size of a [fruit]")`.
- Hero illustration: `Semantics(label: "Illustration of baby development at week [n]")`.
- Body Changes card: `Semantics(label: "Body changes this week")` wrapping the card.
- Each body change item: `Semantics(label: "[change description]")`.
- Baby Development card: `Semantics(label: "Baby development milestones this week")`.
- Each milestone: `Semantics(label: "[milestone description]")`.
- Self-Care checklist heading: `Semantics(label: "Self-care checklist, [completed] of [total] complete")`.
- Each checklist item: `Semantics(label: "[item title], [completed/not completed]", toggled: isCompleted)`.
- Exercise items: `Semantics(label: "[exercise name]: [description]", button: true)`.
- Due date countdown: `Semantics(label: "Due date countdown: [days] days remaining, week [current] of 40, estimated [date]")`.
- Progress bar: `Semantics(label: "Pregnancy progress: [percent] percent complete")`.
- Bottom navigation tabs: each tab labeled with its name.

### Focus Order

1. App bar title and navigation controls
2. Week hero (week number, size comparison, trimester badge)
3. Body Changes card content
4. Baby Development card milestones (top to bottom)
5. Self-Care checklist items (top to bottom)
6. Exercise Guide items (top to bottom)
7. Due Date Countdown (days, progress bar, date)
8. Bottom navigation tabs

### Contrast Notes

- Coral Bloom (#F28B8B) on Cloud White (#FFFFFF): contrast ratio ~3.2:1 — meets AA for large text. Used at Stat scale for week number and days remaining which qualify as large text.
- Lilac Pulse (#8B7ED8) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for milestone icons and data accents.
- Ink Charcoal (#2A2A3A) on Cloud White: contrast ratio ~13.5:1 — exceeds AAA. Used for all primary text and headings.
- Muted Quartz (#8B8B9C) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text only. Used for secondary/metadata text at Data scale or larger.
- Field Green (#6DC48A) checkbox on Cloud White: contrast ratio ~3.1:1 — meets AA for large graphical objects (checkbox is 24dp+). Supplemented by fill state change.
- All interactive elements maintain 44x44dp minimum touch targets.

## 11. Anti-Patterns

- No emojis for fruit/vegetable size comparisons — use custom vector illustrations per the design system
- No pure black (#000000) anywhere — use Ink Charcoal (#2A2A3A) as darkest value
- No glass morphism or backdrop blur — opaque Cloud White cards on Lavender Mist canvas
- No circular loading spinners — use skeleton shimmer loaders matching card dimensions
- No 3-column grids — vertical list layout for all sections
- No floating detached tab bar — bottom nav is flush, opaque, grounded
- No hover-only interaction states — all interactions are tap-based
- No fabricated medical statistics — body changes and development milestones reference established medical literature, clearly presented as general information
- No medical diagnostic language — this is a tracker, not a diagnostic tool. Avoid "diagnose", "treat", "cure"
- No Inter, Poppins, Roboto, or Montserrat fonts — use Plus Jakarta Sans exclusively
- No linear easing on any animation — spring or ease-out only
- No gradient text on headings — flat color only
- No hard black drop-shadows — all shadows carry lilac tint per Pastel Elevation spec
- No `h-screen` — use `min-h-[100dvh]` for full-height sections
- No generic placeholder content — week-specific content must be medically referenced and stage-appropriate
- No landscape layouts — portrait only, locked at app level
