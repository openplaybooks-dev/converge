# Screen Specification: Home

## 1. Screen Title
Home

## 2. Purpose
Primary dashboard showing pregnancy progress, quick stats, and entry points to all features. This is the first screen users see and serves as the central hub for navigating the app.

## 3. Route
`/home`

## 4. Widget Name
`HomeScreen`

## 5. Design Tokens

### Colors
- **Canvas:** Lavender Mist (#EDE8F7) — primary background
- **Canvas Alt:** Blush Veil (#FDEEEE) — pregnancy-mode hero backgrounds
- **Surface:** Cloud White (#FFFFFF) — cards
- **Text Primary:** Ink Charcoal (#2A2A3A)
- **Text Secondary:** Muted Quartz (#8B8B9C)
- **Accent Coral:** Coral Bloom (#F28B8B) — CTAs, active states, weight/mood stat values
- **Accent Coral Tint:** rgba(242, 139, 139, 0.12) — mode pill background, active tab pill
- **Accent Lilac:** Lilac Pulse (#8B7ED8) — data stats (baby size, next checkup)
- **Accent Lilac Tint:** rgba(139, 126, 216, 0.14)
- **Chip Background:** rgba(139, 126, 216, 0.08) — inactive pagination dots

### Typography (Plus Jakarta Sans)
- **Heading:** 1.5rem / 700 — greeting name, hero week title
- **Subheading:** 1.125rem / 600 — mode pill label
- **Body:** 1rem / 600 — CTA button text
- **Stat:** 2.25rem / 800 — large numeric readouts in stat cards
- **Data:** 0.875rem / 500 — unit labels (Kg, wk, /5, days)
- **Caption:** 0.8125rem / 400 — date, hero subtitle, stat labels
- **Micro:** 0.6875rem / 700 — nav tab labels (uppercase)

### Spacing
- **Screen horizontal padding:** 20px (1.25rem)
- **Section spacing:** 28px (1.75rem) between major sections
- **Card internal padding:** 20px (1.25rem) for stat cards, 32px (2rem) for hero card
- **Stat grid gap:** 20px

### Radius
- **Stat cards:** 24px (1.5rem)
- **Hero card:** 32px (2rem)
- **Pill buttons/chips:** 9999px
- **Nav tab active pill:** 12px (1rem)

### Shadows (lilac-tinted)
- **Stat cards:** 0 4px 20px rgba(139, 126, 216, 0.12)
- **Hero card:** 0 8px 32px rgba(139, 126, 216, 0.14)
- **Bottom nav:** 0 -4px 20px rgba(139, 126, 216, 0.08)
- **Avatar:** 0 2px 8px rgba(139, 126, 216, 0.16)

## 6. Layout Rules

### Scaffold
- **AppBar:** Hidden — custom greeting header in body content
- **Body:** CustomScrollView with vertical scroll, Lavender Mist background
- **BottomNavigationBar:** Visible, Cloud White, 5 tabs — Home (active), Progress, Health, Wellness, Learn
- **FAB:** None

### Content Area
- Horizontal padding: 20px on both sides
- Top padding: accounts for status bar safe area
- Bottom padding: accounts for bottom nav height + safe area

## 7. Sections

### 7.1 Greeting Header
- **Layout:** Row — text left-aligned, avatar right-aligned
- **Content:**
  - User name in Heading scale ("Good morning, Mira")
  - Date in Caption scale ("Thursday, 17 April")
  - Avatar: 40px circle, Coral Whisper background, Coral Bloom initial letter, 2px Cloud White border with lilac shadow
- **Widget:** Row with expanded Column for text, CircleAvatar for avatar

### 7.2 Mode Selector Pill
- **Layout:** Centered horizontally
- **Content:** Pill-shaped button with "Pregnancy Mode" text + chevron-down icon
- **Style:** Coral Whisper background, Coral Bloom text and icon, rounded pill
- **Interaction:** Tap opens mode selection bottom sheet
- **Widget:** InkWell wrapping a Container with Row

### 7.3 Hero Illustration Card
- **Layout:** Full-width card, centered content
- **Content:**
  - Fetal development illustration (vector SVG) occupying ~70% of card width
  - Week number heading ("Week 22")
  - Baby size comparison caption ("Your baby is about the size of a mango")
- **Style:** Cloud White background, 32px radius, prominent shadow, 32px internal padding
- **Widget:** Container with Column children

### 7.4 Primary CTA
- **Layout:** Centered pill button
- **Content:** "Track Today" text
- **Style:** Coral Bloom fill, Cloud White text, pill shape, 44px min height
- **Interaction:** Navigates to tracking entry flow
- **Widget:** ElevatedButton or FilledButton with custom shape

### 7.5 Pagination Dots
- **Layout:** Centered horizontal Row with 6px gaps
- **Content:** 3 dots — active dot is 16px wide pill in Coral Bloom, inactive dots are 8px circles in Chip Mist
- **Widget:** Row of AnimatedContainer widgets

### 7.6 Stat Cards Grid
- **Layout:** 2-column grid, 20px gap
- **Cards (4 total):**
  1. **Weight** — icon (coral), value "58.3" + unit "Kg" (coral), label "Your weight"
  2. **Baby Size** — icon (lilac), value "22" + unit "wk" (lilac), label "Baby size"
  3. **Mood** — icon (coral), value "4" + unit "/5" (coral), label "Mood today"
  4. **Next Checkup** — icon (lilac), value "5" + unit "days" (lilac), label "Next checkup"
- **Card style:** Cloud White, 24px radius, standard shadow, 20px padding, centered content
- **Interaction:** Tap each card pushes to corresponding detail screen
- **Widget:** GridView.count(crossAxisCount: 2) with InkWell-wrapped card widgets

## 8. Data

### Entities Consumed
- **PregnancyProfile:** userName, currentWeek, dueDate
- **WeightEntry (latest):** value
- **MoodEntry (latest):** moodLevel
- **Reminder (next):** date, title

### Display Values
- Greeting: "Good morning, {userName}" + formatted current date
- Hero: "Week {currentWeek}" + baby size comparison text
- Stat cards: latest weight, current week, latest mood level, days until next checkup

## 9. Motion

### Entry Animations
- **Stat cards:** Staggered reveal — cascade delay of 80ms between cards, each enters via translateY(12px) to 0 with opacity 0 to 1, spring easing (cubic-bezier(0.34, 1.56, 0.64, 1)), 450ms duration
- **Hero card:** Fade in + scale from 0.98, 450ms spring
- **Numeric count-up:** Weight, week, mood, and checkup values count up from 0, 800ms ease-out on first mount
- **Hero illustration:** Gentle breathing animation — 4s infinite cycle, scale 1.0 to 1.015 to 1.0

### Page Transitions
- **Tab switch:** No push animation (tab-to-tab crossfade)
- **Push to detail:** Content slides up 20px + fade in, 350ms spring
- **Pull-to-refresh:** Coral Bloom refresh indicator

### Pagination Dots
- Active dot width animates with spring easing, 250ms

## 10. Accessibility

### Semantics
- Greeting header: screen heading semantics
- Mode pill: aria-label "Current mode: Pregnancy. Tap to change."
- Hero card: section labeled "Pregnancy progress"
- Stat cards: each labeled with full value ("Your weight: 58.3 kilograms")
- Pagination dots: tablist with tab roles and aria-selected
- Bottom nav: labeled "Main navigation" with current page indicator

### Focus Order
1. Greeting header
2. Mode selector pill
3. Hero illustration card
4. Primary CTA button
5. Pagination dots
6. Stat cards (left-to-right, top-to-bottom)
7. Bottom navigation tabs

### Contrast
- Ink Charcoal (#2A2A3A) on Lavender Mist (#EDE8F7): exceeds 4.5:1
- Cloud White text on Coral Bloom (#F28B8B): verify 3:1 for large text

## 11. Anti-Patterns

- No emojis — use vector illustrations
- No pure black (#000000) — use Ink Charcoal (#2A2A3A)
- No 3-column grids — 2-column maximum
- No circular loading spinners — skeleton shimmer only
- No glass morphism — opaque pastel cards
- No Inter/Poppins/Roboto fonts — Plus Jakarta Sans only
- No hardcoded colors — use theme colorScheme
- No floating detached tab bars — flush bottom, opaque
- No generic placeholder names — use "Mira" for demo
- No medical claims or fake statistics
- No gradient text on headings
