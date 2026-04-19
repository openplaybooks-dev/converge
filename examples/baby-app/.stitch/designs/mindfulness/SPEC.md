# Screen Specification: Mindfulness

## 1. Screen Title

Mindfulness

## 2. Purpose

Provide a curated catalog of breathing exercises, stretching guides, and meditation activities for stress relief during pregnancy. Acts as the primary wellness activity hub where users browse, filter, and launch guided exercises, with an optional mood check-in prompt to encourage daily emotional awareness.

## 3. Route

`/mindfulness`

## 4. Widget Name

`MindfulnessScreen`

## 5. Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary Canvas | Lavender Mist (#EDE8F7) | Screen background |
| Card Surface | Cloud White (#FFFFFF) | All content cards, exercise grid cards |
| Primary Accent | Coral Bloom (#F28B8B) | Featured exercise highlight, mood banner CTA |
| Coral Whisper | rgba(242, 139, 139, 0.12) | Active category chip background, mood banner soft fill |
| Secondary Accent | Lilac Pulse (#8B7ED8) | Exercise category icons, duration metadata |
| Lilac Whisper | rgba(139, 126, 216, 0.14) | Selected chip emphasis |
| Text Primary | Ink Charcoal (#2A2A3A) | Exercise names, section headings |
| Text Secondary | Muted Quartz (#8B8B9C) | Duration labels, category metadata, mood prompt text |
| Divider | Ghost Divide rgba(42, 42, 58, 0.06) | Separators within exercise grid |
| Chip Background | Chip Mist rgba(139, 126, 216, 0.08) | Inactive category chip fill |
| Success | Field Green (#6DC48A) | Mood logged confirmation |

### Typography

| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Screen title | Display (2rem) | 800 | "Mindfulness" in pinned app bar |
| Section headers | Heading (1.5rem) | 700 | "Featured", category group headings |
| Card titles | Subheading (1.125rem) | 600 | Exercise names in cards |
| Body text | Body (1rem) | 400 | Exercise descriptions, mood prompt copy |
| Metadata | Data (0.875rem) | 500 | Duration labels ("5 min"), category tags |
| Helper text | Caption (0.8125rem) | 400 | Card subtitles, chip labels |
| Badges | Micro (0.6875rem) | 700 | Category badge text (uppercase) |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| Screen horizontal padding | 20dp (1.25rem) | Left/right content inset |
| Section gap | 24dp | Between category chips, featured card, exercise grid, mood banner |
| Card internal padding | 20dp | Inside exercise cards and mood banner |
| Featured card padding | 32dp | Extra padding inside featured exercise card |
| Grid gap | 12dp | Between exercise grid cards |
| Chip spacing | 8dp | Between category chips in horizontal scroll |

### Corner Radius

| Token | Value | Usage |
|-------|-------|-------|
| Featured card | 32dp (2rem) | Featured exercise hero card |
| Exercise grid cards | 24dp (1.5rem) | Individual exercise cards |
| Category chips | 9999px | Fully rounded filter chips |
| Mood banner | 24dp (1.5rem) | Mood check-in banner card |

### Elevation

| Token | Shadow | Usage |
|-------|--------|-------|
| Prominent | 0 8px 32px rgba(139, 126, 216, 0.14) | Featured exercise card |
| Standard | 0 4px 20px rgba(139, 126, 216, 0.12) | Exercise grid cards, mood banner |
| Subtle | 0 2px 8px rgba(139, 126, 216, 0.08) | Card press state |
| Bottom Nav | 0 -4px 20px rgba(139, 126, 216, 0.08) | Tab bar |

## 6. Layout Rules

### Scaffold

- **AppBar:** `SliverAppBar` with title "Mindfulness" in Display scale, Ink Charcoal, pinned. Cloud White background.
- **Body:** `CustomScrollView` containing sliver-based sections on Lavender Mist canvas.
- **BottomNavigationBar:** Visible. Wellness tab active. Cloud White background, Coral Bloom active icon/label on Coral Whisper pill, Muted Quartz inactive.
- **FAB:** None.

### Content Width

Full viewport width with 20dp horizontal padding. No max-width wrapper. Cards fill available width.

### Vertical Spacing

Content starts 0.75rem below status bar safe-area inset. Sections separated by 24dp gaps. Content ends 0.75rem above tab bar.

## 7. Sections

### 7.1 Category Chips

- **Description:** Horizontal scrollable row of filter chips for exercise categories. Allows users to filter the exercise grid by type.
- **Widget type:** `SliverToBoxAdapter` containing a horizontal `ListView` of `ChoiceChip` widgets.
- **Container:** No card wrapper. Chips sit directly on the Lavender Mist canvas with 20dp horizontal padding. Horizontal scroll with content peeking off-screen right to signal scrollability.
- **Data requirements:** Static category list: "All", "Breathing", "Stretching", "Meditation".
- **Content:**
  - Each chip: pill-shaped (9999px radius), Chip Mist background when inactive, Lilac Whisper background with Lilac Pulse text (weight 600) when selected.
  - Text in Caption scale, Muted Quartz (inactive) or Lilac Pulse (active).
  - "All" is selected by default on screen load.
  - Minimum tap target: 44px height including padding.
  - Padding: 0.5rem vertical, 1rem horizontal per chip. 8dp gap between chips.
- **Interactive elements:**
  - Tap chip → select that category, deselect others, filter exercise grid and featured card to matching category (or show all).

### 7.2 Featured Exercise Card

- **Description:** Large hero-style card highlighting a recommended exercise with illustration, name, and duration estimate. Draws user attention to a single suggested activity.
- **Widget type:** Cloud White card containing a `Column` with illustration area, exercise name, and duration.
- **Container:** 32dp border-radius, prominent elevation, 32dp internal padding. Full width within horizontal padding.
- **Data requirements:** One `Exercise` entity (featured/recommended for current context). Fields: `name`, `category`, `duration`, illustration asset.
- **Content:**
  - Illustration: centered, occupying ~70% of card width. Custom vector art depicting the exercise (e.g., breathing figure, stretch pose). Gentle breathing animation: 4s cycle, scale 1.0 → 1.015 → 1.0.
  - Exercise name: Heading scale, Ink Charcoal, below illustration.
  - Category tag: Micro scale, uppercase, Lilac Pulse text on Chip Mist pill.
  - Duration: Data scale, Muted Quartz (e.g., "5 min").
- **Interactive elements:**
  - Tap card → push to exercise detail screen (`/mindfulness/exercise/:id`).

### 7.3 Exercise Grid

- **Description:** 2-column grid of exercise cards showing available breathing techniques, stretches, and guided relaxation activities. Filtered by the active category chip.
- **Widget type:** `SliverGrid` with `SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2)` and 12dp cross-axis and main-axis spacing.
- **Container:** Each card is Cloud White, 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** List of `Exercise` entities filtered by selected category. Each exercise: `id`, `name`, `category`, `duration`, illustration asset.
- **Content per card:**
  - Illustration: centered at top of card, ~60% of card width. Custom vector art.
  - Exercise name: Subheading scale, Ink Charcoal.
  - Category: Caption scale, Muted Quartz.
  - Duration: Data scale, Muted Quartz, with Lilac Pulse clock icon (16px) inline.
- **Interactive elements:**
  - Tap exercise card → push to exercise detail screen (`/mindfulness/exercise/:id`).
  - Press state: shadow softens to subtle elevation, card compresses `translateY(1px)`.

### 7.4 Mood Check-In Banner

- **Description:** Gentle prompt card encouraging the user to log their current mood if they have not logged today. Disappears or shows confirmation when mood is logged.
- **Widget type:** Cloud White card containing a `Row` with icon, prompt text, and action button.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding. Full width within horizontal padding.
- **Data requirements:** `MoodEntry` for today — check if an entry exists for the current date.
- **Content:**
  - When no mood logged today:
    - Left icon: Lucide `smile` at 24px, Coral Bloom.
    - Prompt text: "How are you feeling today?" in Subheading scale, Ink Charcoal.
    - Subtitle: "Take a moment to check in" in Caption scale, Muted Quartz.
    - Action: Coral Bloom pill button "Log Mood" (Caption scale, Cloud White text).
  - When mood already logged:
    - Left icon: Lucide `check-circle` at 24px, Field Green.
    - Text: "Mood logged today" in Subheading scale, Ink Charcoal, with time in Caption scale, Muted Quartz.
- **Interactive elements:**
  - Tap "Log Mood" button or tap banner → present mood logging bottom sheet (mood emoji selector + optional note).

## 8. Data

### Entities

**Exercise** (reference data, primary)
- `id`: String — unique identifier
- `name`: String — exercise name (e.g., "Deep Breathing", "Prenatal Stretch")
- `category`: ExerciseCategory — breathing, stretching, meditation
- `duration`: Duration — estimated exercise time
- `steps`: List\<String\> — step-by-step instructions
- `benefits`: List\<String\> — wellness benefits
- `illustration`: String — asset path for exercise illustration

**MoodEntry** (today's entry, secondary)
- `id`: String — unique identifier
- `date`: DateTime — entry date
- `moodLevel`: int (1–5) — mood scale
- `energyLevel`: int (1–5) — energy scale
- `notes`: String? — optional note

### Screen Data Flow

- Exercise catalog is loaded as reference data and filtered client-side by category chip selection.
- Featured exercise is determined by a recommendation rule (e.g., first exercise in selected category, or a daily rotation).
- Mood check-in banner queries today's `MoodEntry` to determine logged/not-logged state.

## 9. Motion

### Entry Animations

- Category chips row fades in with opacity 0 → 1 over 300ms, spring easing.
- Featured exercise card enters via `translateY(12px)` → `translateY(0)` with opacity 0 → 1, spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`), 450ms.
- Featured card illustration has perpetual breathing animation: 4s cycle, `scale(1.0)` → `scale(1.015)` → `scale(1.0)`.
- Exercise grid cards cascade with 80ms stagger delay between cards. Each enters via `translateY(12px)` → `translateY(0)` with opacity 0 → 1, spring easing, 450ms.
- Mood check-in banner enters with 80ms stagger after the last visible grid card, same spring animation.

### Category Filter Transition

- When a category chip is tapped, grid cards fade out over 180ms ease-out, then filtered results fade in with the staggered reveal pattern (80ms per card, spring easing).

### Card Press States

- Exercise grid cards and featured card: shadow softens to subtle elevation (`0 2px 8px rgba(139, 126, 216, 0.08)`) and card compresses `translateY(1px)` over 100ms on press.

### Page Transitions

- Forward navigation (tap exercise → detail): content slides up 20px and fades in, 350ms spring.
- Back navigation: content fades out, 180ms ease-out.
- Bottom sheet entry (mood logging): slides up from bottom with spring overshoot, 400ms.

## 10. Accessibility

### Semantics Labels

- Screen: `Semantics(label: "Mindfulness exercises")`.
- Category chips: `Semantics(label: "[category] filter, [selected/not selected]", button: true)` for each chip.
- Featured exercise card: `Semantics(label: "Featured exercise: [name], [category], [duration]", button: true)`.
- Featured illustration: `Semantics(label: "Illustration for [exercise name]")`.
- Exercise grid cards: `Semantics(label: "[name], [category], [duration]", button: true)` for each card.
- Mood banner (not logged): `Semantics(label: "Mood check-in: How are you feeling today? Tap to log mood", button: true)`.
- Mood banner (logged): `Semantics(label: "Mood logged today")`.
- Bottom navigation tabs: each tab labeled with its name.

### Focus Order

1. App bar title
2. Category chips (left to right)
3. Featured exercise card
4. Exercise grid cards (left to right, top to bottom)
5. Mood check-in banner
6. Bottom navigation tabs

### Contrast Notes

- Ink Charcoal (#2A2A3A) on Cloud White (#FFFFFF): contrast ratio ~13.5:1 — exceeds AAA. Used for all primary text and exercise names.
- Muted Quartz (#8B8B9C) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for metadata at Data scale or larger.
- Coral Bloom (#F28B8B) on Cloud White: contrast ratio ~3.2:1 — meets AA for large text. Used for mood banner icon and action button.
- Lilac Pulse (#8B7ED8) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for category icons and selected chip text.
- Cloud White text on Coral Bloom button: contrast ratio ~3.2:1 — meets AA for large text. Button text uses Caption scale (qualifies with 44dp tap target).
- All interactive elements maintain 44x44dp minimum touch targets.

## 11. Anti-Patterns

- No emojis for mood or exercise categories — use custom vector illustrations and Lucide icons
- No pure black (#000000) anywhere — use Ink Charcoal (#2A2A3A) as darkest value
- No glass morphism or backdrop blur — opaque Cloud White cards on Lavender Mist canvas
- No circular loading spinners — use skeleton shimmer loaders matching card dimensions
- No 3-column grids — 2-column is the maximum for the exercise grid
- No floating detached tab bar — bottom nav is flush, opaque, grounded
- No hover-only interaction states — all interactions are tap-based
- No Inter, Poppins, Roboto, or Montserrat fonts — use Plus Jakarta Sans exclusively
- No linear easing on any animation — spring or ease-out only
- No gradient text on headings — flat color only
- No hard black drop-shadows — all shadows carry lilac tint per Pastel Elevation spec
- No `h-screen` — use `min-h-[100dvh]` for full-height sections
- No landscape layouts — portrait only, locked at app level
- No medical diagnostic language — exercises are for wellness, not treatment
- No fabricated health claims — avoid invented statistics about exercise benefits
