# Pregnant Tracker - Baby Bump: UX Specification

## Part 1: Project Overview

**App Name:** Pregnant Tracker - Baby Bump
**Platform:** Flutter mobile (iOS & Android, portrait only)
**Description:** A wellness-focused mobile companion for expecting mothers that combines cycle tracking, pregnancy progress monitoring, nutrition management, and mindfulness tools — all stored privately on-device.

**Core Identity:** Nurturing, Calm, Trustworthy, Gentle

**User Personas:**
- **First-Time Expecting Mothers** — Need week-by-week guidance, reassurance, and educational content about pregnancy stages
- **Health-Conscious Mothers** — Track weight, nutrition, and exercise; value data visualization and progress charts
- **Anxiety-Prone Mothers** — Rely on breathing exercises, mood tracking, and mindfulness tools for emotional wellness

---

## Part 2: Vibe

**Visual Atmosphere:** A soft, sunlit nursery — pastel lavender and blush surfaces with white content cards floating above on lilac-tinted shadows. Warm yet clean, never clinical.

**Color Mood:** Warm pastels — lavender mist backgrounds, blush accents, coral-pink for actions, lilac purple for data
**Typography Character:** Modern, rounded, friendly — Plus Jakarta Sans with generous weight range
**Motion Personality:** Gentle spring physics — fluid card reveals, counting-up numbers, breathing illustrations. Nothing abrupt.

**Vibe Dimensions:**
- **Temperature:** Warm (8/10)
- **Density:** Spacious (4/10) — generous whitespace for emotional calm
- **Formality:** Casual-warm (3/10)
- **Motion:** Animated-gentle (6/10) — spring physics, staggered reveals
- **Depth:** Layered (7/10) — pastel elevation with tinted shadows

---

## Part 3: Screens

### 3.1 Home Screen
**Route:** `/home`
**Purpose:** Primary dashboard showing pregnancy progress, quick stats, and entry points to all features

**Scaffold:**
- AppBar: Hidden (custom greeting header in body)
- BottomNavigationBar: Visible (Home tab active)
- FAB: None

**Body:** `CustomScrollView` with vertical scroll
**Sections:**
1. **Greeting Header** — User name (Heading scale) + date (Caption) left-aligned, avatar circle right-aligned
2. **Mode Selector Pill** — Centered pill showing current mode (Pregnancy/Wellness) with chevron-down, taps to open mode bottom sheet
3. **Hero Illustration Card** — Full-width card with fetal development illustration, current week number, and baby size comparison (fruit analogy)
4. **Primary CTA** — Pill-shaped coral button ("Track Today" or contextual action)
5. **Pagination Dots** — Indicate swipeable hero content
6. **Stat Cards Grid** — 2-column grid: Weight card, Baby Size card, Mood card, Next Checkup card

**Data:** Current pregnancy week, weight (latest entry), baby size comparison, mood (latest entry), next scheduled checkup
**Interactions:**
- Tap stat card → push to corresponding detail screen
- Tap mode pill → present mode selection bottom sheet
- Swipe hero card → page through weekly highlights
- Pull down → refresh data

**Transitions:** Tab switch (no push animation when switching tabs)

### 3.2 Cycle Tracking Screen
**Route:** `/cycle`
**Purpose:** Track menstrual cycles, view ovulation predictions and fertile windows

**Scaffold:**
- AppBar: `SliverAppBar` with title "Cycle Tracker", pinned
- BottomNavigationBar: Visible (Cycle tab active)
- FAB: FloatingActionButton for logging new cycle entry

**Body:** `CustomScrollView`
**Sections:**
1. **Calendar View** — Monthly calendar with color-coded cycle days, ovulation markers, fertile window highlights
2. **Current Cycle Summary Card** — Cycle length, days until next period, ovulation prediction
3. **Cycle History List** — Previous cycles with start/end dates, duration, notes
4. **Irregular Cycle Notes** — Card for flagging and annotating irregular cycles

**Data:** Cycle entries (start date, end date, notes, irregular flag), calculated ovulation dates, fertile windows
**Interactions:**
- Tap calendar day → log or edit cycle data (bottom sheet)
- Tap FAB → quick-log cycle start
- Tap cycle history item → push cycle detail
- Long press calendar day → add note

**Transitions:** Push from tab navigation

### 3.3 Weight & Nutrition Screen
**Route:** `/weight`
**Purpose:** Track pregnancy weight changes, view progress charts, access nutrition tips

**Scaffold:**
- AppBar: `SliverAppBar` with title "Weight & Nutrition", collapsing on scroll
- BottomNavigationBar: Visible (Health tab active)
- FAB: FloatingActionButton for logging new weight entry

**Body:** `CustomScrollView`
**Sections:**
1. **Weight Chart Card** — Line chart showing weight over time, Lilac Pulse stroke with gradient fill, current value highlighted
2. **BMI Gauge Card** — Horizontal 5-segment gauge with current BMI needle, height toggle, and BMI value display
3. **Quick Stats Row** — Current weight, weight change this week, target range
4. **Nutrition Tips Card** — Stage-appropriate nutrition and hydration tips, updated per pregnancy week
5. **Weight History List** — Daily entries with date, weight value, and optional notes

**Data:** Weight entries (date, value), calculated BMI, height, current pregnancy week, nutrition tips per trimester
**Interactions:**
- Tap FAB → bottom sheet with weight input field and date picker
- Tap chart data point → highlight value with tooltip
- Tap nutrition tip → expand with detail
- Pull down → refresh

**Transitions:** Push from home stat card or tab switch

### 3.4 Pregnancy Progress Screen
**Route:** `/progress`
**Purpose:** View weekly pregnancy updates, body changes, baby development milestones

**Scaffold:**
- AppBar: `SliverAppBar(expandedHeight: 280)` with hero illustration in flexibleSpace, title "Week {n}"
- BottomNavigationBar: Visible (Progress tab active)
- FAB: None

**Body:** `CustomScrollView`
**Sections:**
1. **Week Hero** — Collapsing header with baby illustration and size comparison (fruit/vegetable)
2. **Body Changes Card** — What's happening with mom this week
3. **Baby Development Card** — What's developing this week (organs, senses, movement)
4. **Self-Care Checklist** — Daily reminders: hydration, kegel exercises, stretching, prenatal vitamins
5. **Exercise Guide Card** — Safe exercises for current trimester with clear instructions
6. **Due Date Countdown** — Days remaining, progress bar, estimated delivery date

**Data:** Pregnancy week content (body changes, baby development), due date, self-care checklist state, exercise guides per trimester
**Interactions:**
- Swipe left/right on week hero → navigate to adjacent weeks (PageView)
- Tap checklist item → toggle completion
- Tap exercise card → push exercise detail
- Tap due date → push due date settings (set or recalculate from LMP)

**Transitions:** Tab switch, push from home hero card

### 3.5 Mindfulness Screen
**Route:** `/mindfulness`
**Purpose:** Access breathing exercises, stretching guides, and mindful activities for stress relief

**Scaffold:**
- AppBar: `SliverAppBar` with title "Mindfulness", pinned
- BottomNavigationBar: Visible (Wellness tab active)
- FAB: None

**Body:** `CustomScrollView`
**Sections:**
1. **Category Chips** — Horizontal scroll: Breathing, Stretching, Meditation, All
2. **Featured Exercise Card** — Large card with illustration, exercise name, duration estimate
3. **Exercise Grid** — 2-column grid of exercise cards (breathing techniques, stretches, guided relaxation)
4. **Mood Check-In Banner** — Gentle prompt to log current mood if not logged today

**Data:** Exercise catalog (name, category, duration, instructions, illustration), today's mood entry
**Interactions:**
- Tap category chip → filter exercises
- Tap exercise card → push exercise detail/player screen
- Tap mood banner → present mood logging bottom sheet

**Transitions:** Tab switch

### 3.6 Exercise Detail Screen
**Route:** `/mindfulness/exercise/:id`
**Purpose:** Guide user through a specific breathing or stretching exercise

**Scaffold:**
- AppBar: Back button + exercise name
- BottomNavigationBar: Hidden
- FAB: None
- PersistentFooterButtons: "Start Exercise" coral pill button

**Body:** `SingleChildScrollView`
**Sections:**
1. **Illustration Card** — Full-width hero with exercise illustration
2. **Instructions** — Step-by-step guide with numbered steps
3. **Duration & Difficulty** — Metadata chips
4. **Benefits** — Brief list of wellness benefits

**Data:** Exercise entity (name, steps, duration, category, illustration)
**Interactions:**
- Tap "Start Exercise" → begin guided timer/animation sequence
- Swipe from edge → pop back

**Transitions:** Push from mindfulness grid, pop to return

### 3.7 Health Log Screen
**Route:** `/health-log`
**Purpose:** Central place for doctor visits, symptoms, and checkup reminders

**Scaffold:**
- AppBar: `SliverAppBar` with title "Health Log", pinned
- BottomNavigationBar: Visible (Health tab active, via TabBar sub-navigation)
- FAB: FloatingActionButton for adding new entry

**Body:** `DefaultTabController` with `TabBarView`
**Tabs:**
1. **Doctor Visits** — List of visit notes with date, doctor name, summary
2. **Symptoms** — Logged symptoms with date, type, severity (color-coded)
3. **Reminders** — Upcoming checkups and scheduled reminders

**Data:** Doctor visit notes, symptom entries (date, type, severity, notes), reminders (date, title, notification)
**Interactions:**
- Tap FAB → bottom sheet with entry type selection (Visit / Symptom / Reminder)
- Tap list item → push detail/edit screen
- Swipe list item → delete with confirmation dialog
- Tap reminder → toggle done/pending

**Transitions:** Push from home "Next Checkup" card, tab switch

### 3.8 Mood & Wellness Screen
**Route:** `/mood`
**Purpose:** Log moods and energy levels, view emotional patterns over time

**Scaffold:**
- AppBar: `SliverAppBar` with title "Mood & Wellness", collapsing
- BottomNavigationBar: Visible (Wellness tab active)
- FAB: FloatingActionButton for quick mood log

**Body:** `CustomScrollView`
**Sections:**
1. **Today's Mood Card** — Current mood emoji/icon selection (if logged), or prompt to log
2. **Mood Chart** — Line or bar chart showing mood patterns over past 2 weeks
3. **Energy Level Tracker** — Simple scale visualization for today's energy
4. **Wellness Recommendations Card** — Gentle suggestions based on recent mood patterns (e.g., "You've been feeling tired lately — try a breathing exercise")
5. **Mood History List** — Recent mood entries with date, mood level, notes

**Data:** Mood entries (date, mood level, energy level, notes), calculated patterns, wellness recommendations
**Interactions:**
- Tap FAB → present mood logging bottom sheet (mood selector + energy slider + optional note)
- Tap mood history item → view detail
- Tap recommendation → navigate to relevant mindfulness exercise
- Pull down → refresh

**Transitions:** Tab switch, push from mindfulness mood banner

### 3.9 Education Screen
**Route:** `/education`
**Purpose:** Browse trusted educational content about maternal care, nutrition, and body changes

**Scaffold:**
- AppBar: `SliverAppBar` with title "Learn", pinned, search action
- BottomNavigationBar: Visible
- FAB: None

**Body:** `CustomScrollView`
**Sections:**
1. **Topic Chips** — Horizontal scroll: All, Nutrition, Body Changes, Maternal Care, Baby Development
2. **Featured Article Card** — Large hero card with illustration and title
3. **Article List** — Vertical list of article cards grouped by topic, with Ghost Divide separators
4. **Bookmarked Section** — Saved articles for quick access

**Data:** Article catalog (title, topic, body content, illustration, bookmarked flag)
**Interactions:**
- Tap topic chip → filter articles
- Tap article card → push article reader
- Long press article → bookmark toggle
- Tap search icon → expand search field

**Transitions:** Tab switch

### 3.10 Article Reader Screen
**Route:** `/education/article/:id`
**Purpose:** Read a single educational article in a focused, distraction-free view

**Scaffold:**
- AppBar: Back button + article title (truncated), bookmark action
- BottomNavigationBar: Hidden
- FAB: None

**Body:** `SingleChildScrollView`
**Sections:**
1. **Hero Image** — Full-width illustration
2. **Title & Metadata** — Article title (Display scale), topic chip, read time
3. **Article Body** — Rich text content with subheadings, paragraphs, and inline tips
4. **Related Articles** — Horizontal scroll of related article cards at bottom

**Data:** Article entity
**Interactions:**
- Tap bookmark icon → toggle bookmark
- Tap related article → push new reader
- Swipe from edge → pop back

**Transitions:** Push from education list, pop to return

### 3.11 Settings Screen
**Route:** `/settings`
**Purpose:** Configure app preferences, manage due date, toggle reminders and notifications

**Scaffold:**
- AppBar: Title "Settings", back button
- BottomNavigationBar: Hidden
- FAB: None

**Body:** `ListView`
**Sections:**
1. **Profile Section** — Name, avatar, due date display
2. **Pregnancy Settings** — Due date picker, trimester display
3. **Notifications** — Toggle switches for daily reminders, checkup alerts, self-care nudges
4. **Display** — Reduced motion toggle, units (kg/lbs)
5. **Data** — Export data, clear all data (destructive, with confirmation dialog)
6. **About** — App version, privacy notice

**Data:** User preferences, due date, notification settings
**Interactions:**
- Tap due date → date picker dialog
- Toggle switches → update preferences
- Tap "Clear All Data" → confirmation dialog with destructive action
- Tap avatar → edit name bottom sheet

**Transitions:** Push from profile icon or home menu

---

## Part 4: Navigation Architecture

### Navigator Structure
GoRouter with `ShellRoute` for bottom navigation. Each tab maintains its own navigation stack.

### Bottom Navigation (5 tabs)
| Tab | Label | Icon (inactive) | Icon (active) | Route |
|-----|-------|-----------------|----------------|-------|
| 1 | Home | `Icons.home_outlined` | `Icons.home` | `/home` |
| 2 | Progress | `Icons.calendar_today_outlined` | `Icons.calendar_today` | `/progress` |
| 3 | Health | `Icons.favorite_outline` | `Icons.favorite` | `/weight` |
| 4 | Wellness | `Icons.self_improvement_outlined` | `Icons.self_improvement` | `/mindfulness` |
| 5 | Learn | `Icons.menu_book_outlined` | `Icons.menu_book` | `/education` |

### Push Routes
- Home stat card → `/weight`, `/mood`, `/health-log`
- Home hero card → `/progress`
- Mindfulness exercise card → `/mindfulness/exercise/:id`
- Education article card → `/education/article/:id`
- Settings gear icon → `/settings`
- Cycle tracker (accessible from Health tab) → `/cycle`

### Modal Routes (Bottom Sheets)
- Mode selector → mode selection sheet
- Weight FAB → weight entry sheet
- Mood FAB → mood logging sheet
- Health Log FAB → entry type selection sheet
- Cycle day tap → cycle entry sheet

### Dialogs
- Clear data confirmation
- Delete entry confirmation
- Due date picker

---

## Part 5: Data Context

### Entities

**PregnancyProfile**
- dueDate: DateTime
- lastMenstrualPeriod: DateTime
- currentWeek: int (calculated)
- currentTrimester: int (calculated)
- userName: String
- height: double
- units: WeightUnit (kg/lbs)

**WeightEntry**
- id: String
- date: DateTime
- value: double
- notes: String?

**CycleEntry**
- id: String
- startDate: DateTime
- endDate: DateTime?
- isIrregular: bool
- notes: String?

**MoodEntry**
- id: String
- date: DateTime
- moodLevel: int (1-5)
- energyLevel: int (1-5)
- notes: String?

**SymptomEntry**
- id: String
- date: DateTime
- type: SymptomType
- severity: int (1-3)
- notes: String?

**DoctorVisit**
- id: String
- date: DateTime
- doctorName: String?
- summary: String
- notes: String?

**Reminder**
- id: String
- date: DateTime
- title: String
- isDone: bool

**Article**
- id: String
- title: String
- topic: ArticleTopic
- body: String
- isBookmarked: bool

**Exercise**
- id: String
- name: String
- category: ExerciseCategory (breathing, stretching, meditation)
- duration: Duration
- steps: List<String>
- benefits: List<String>

### Relationships
- PregnancyProfile → has many WeightEntries
- PregnancyProfile → has many CycleEntries
- PregnancyProfile → has many MoodEntries
- PregnancyProfile → has many SymptomEntries
- PregnancyProfile → has many DoctorVisits
- PregnancyProfile → has many Reminders
- Articles and Exercises are standalone reference data

### Screen → Entity Mapping
| Screen | Entities Consumed |
|--------|-------------------|
| Home | PregnancyProfile, WeightEntry (latest), MoodEntry (latest), Reminder (next) |
| Cycle Tracking | CycleEntry, PregnancyProfile |
| Weight & Nutrition | WeightEntry, PregnancyProfile |
| Pregnancy Progress | PregnancyProfile (week content) |
| Mindfulness | Exercise, MoodEntry (today) |
| Exercise Detail | Exercise |
| Health Log | DoctorVisit, SymptomEntry, Reminder |
| Mood & Wellness | MoodEntry, PregnancyProfile |
| Education | Article |
| Article Reader | Article |
| Settings | PregnancyProfile |

---

## Part 6: Design Tokens

### Color Palette (Material 3)
- **Seed Color:** Coral Bloom (#F28B8B)
- **Primary Canvas:** Lavender Mist (#EDE8F7)
- **Alternate Canvas:** Blush Veil (#FDEEEE)
- **Card Surface:** Cloud White (#FFFFFF)
- **Primary Accent:** Coral Bloom (#F28B8B) — CTAs, active states
- **Secondary Accent:** Lilac Pulse (#8B7ED8) — data visualization, charts
- **Text Primary:** Ink Charcoal (#2A2A3A)
- **Text Secondary:** Muted Quartz (#8B8B9C)
- **Success:** Field Green (#6DC48A)
- **Error:** Fault Red (#E85C5C)
- **Warning:** Caution Amber (#F4C84D)

### Typography
- **Font Family:** Plus Jakarta Sans (Google Fonts)
- **Display:** 2rem / 800 weight — screen titles
- **Stat:** 2.25rem / 800 weight — large numeric readouts
- **Heading:** 1.5rem / 700 weight — section headers
- **Subheading:** 1.125rem / 600 weight — card titles
- **Body:** 1rem / 400 weight — descriptions, paragraphs
- **Data:** 0.875rem / 500 weight — units, metadata
- **Caption:** 0.8125rem / 400 weight — helper text, dates
- **Micro:** 0.6875rem / 700 weight — chart axis labels, badges

### Spacing Rhythm (base 8dp)
- **4dp** — tight internal padding (chip text to chip edge)
- **8dp** — minimum spacing between related elements
- **12dp** — spacing between items in a list
- **16dp** — card internal padding (compact)
- **20dp** — standard card internal padding
- **24dp** — spacing between cards/sections
- **28dp** — section spacing on detail screens
- **32dp** — hero card internal padding

### Corner Radius Scale
- **8dp** — input fields, small chips
- **12dp** — buttons (non-pill)
- **16dp** — small cards, tooltips
- **24dp** — standard stat cards
- **32dp** — hero illustration cards
- **9999px** — pill buttons, chips, mode selector, avatar

### Elevation (Pastel Elevation — lilac-tinted shadows)
- **Subtle:** `0 2px 8px rgba(139, 126, 216, 0.08)` — hover/press states
- **Standard:** `0 4px 20px rgba(139, 126, 216, 0.12)` — stat cards, data panels
- **Prominent:** `0 8px 32px rgba(139, 126, 216, 0.14)` — hero cards, modals
- **Bottom Nav:** `0 -4px 20px rgba(139, 126, 216, 0.08)` — tab bar upward shadow
- **Bottom Sheet:** `0 -8px 32px rgba(139, 126, 216, 0.16)` — sheet top-edge shadow

### Animation Curves & Durations
- **Spring (default):** `cubic-bezier(0.34, 1.56, 0.64, 1)` — 450ms — card entry, toggle, chart points
- **Exit:** `cubic-bezier(0.25, 0, 0, 1)` — 180ms — elements leaving viewport
- **Count-up:** ease-out — 800ms — numeric value reveals on first mount
- **Stagger delay:** 80ms between cascading cards, 60ms between chart points
- **Chart line draw:** 800ms via stroke-dashoffset
- **Hero breathing:** 4s infinite cycle, scale 1.0 → 1.015 → 1.0
- **Page forward:** slide up 20px + fade in, 350ms spring
- **Page back:** fade out, 180ms ease-out
- **Bottom sheet:** slide up with spring overshoot, 400ms
