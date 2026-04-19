# Screen Specification: Exercise Detail

## 1. Screen Title

Exercise Detail

## 2. Purpose

Guide the user through a specific breathing, stretching, or meditation exercise with step-by-step instructions, duration and difficulty metadata, and a list of wellness benefits. Serves as the focused execution view reached from the mindfulness exercise grid or featured exercise card.

## 3. Route

`/mindfulness/exercise/:id`

## 4. Widget Name

`ExerciseDetailScreen`

## 5. Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary Canvas | Lavender Mist (#EDE8F7) | Screen background |
| Card Surface | Cloud White (#FFFFFF) | Illustration card, instruction card, benefits card |
| Primary Accent | Coral Bloom (#F28B8B) | "Start Exercise" footer button fill |
| Coral Whisper | rgba(242, 139, 139, 0.12) | Category chip background |
| Secondary Accent | Lilac Pulse (#8B7ED8) | Duration/difficulty chip icons, step numbers |
| Lilac Whisper | rgba(139, 126, 216, 0.14) | Metadata chip selected state |
| Text Primary | Ink Charcoal (#2A2A3A) | Exercise name, instruction text, benefit items |
| Text Secondary | Muted Quartz (#8B8B9C) | Step labels, metadata values, caption text |
| Chip Background | Chip Mist rgba(139, 126, 216, 0.08) | Duration and difficulty chip fill |
| Divider | Ghost Divide rgba(42, 42, 58, 0.06) | Between instruction steps |

### Typography

| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Screen title | Display (2rem) | 800 | Exercise name in app bar |
| Section headers | Heading (1.5rem) | 700 | "Instructions", "Benefits" |
| Exercise name | Subheading (1.125rem) | 600 | Exercise name below illustration |
| Body text | Body (1rem) | 400 | Instruction step descriptions, benefit descriptions |
| Metadata | Data (0.875rem) | 500 | Duration value, difficulty label |
| Helper text | Caption (0.8125rem) | 400 | Chip labels, step numbering |
| Badge text | Micro (0.6875rem) | 700 | Category badge (uppercase) |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| Screen horizontal padding | 20dp (1.25rem) | Left/right content inset |
| Section gap | 24dp | Between illustration card, instructions, metadata chips, benefits |
| Card internal padding | 20dp | Inside instruction and benefits cards |
| Illustration card padding | 32dp | Extra padding inside hero illustration card |
| Step spacing | 12dp | Between instruction steps |
| Chip spacing | 8dp | Between duration and difficulty chips |

### Corner Radius

| Token | Value | Usage |
|-------|-------|-------|
| Illustration card | 32dp (2rem) | Hero illustration card |
| Content cards | 24dp (1.5rem) | Instruction card, benefits card |
| Metadata chips | 9999px | Duration and difficulty pill chips |
| Footer button | 9999px | "Start Exercise" pill button |

### Elevation

| Token | Shadow | Usage |
|-------|--------|-------|
| Prominent | 0 8px 32px rgba(139, 126, 216, 0.14) | Hero illustration card |
| Standard | 0 4px 20px rgba(139, 126, 216, 0.12) | Instruction card, benefits card |
| Subtle | 0 2px 8px rgba(139, 126, 216, 0.08) | Card press state |

## 6. Layout Rules

### Scaffold

- **AppBar:** Back button (Lucide `arrow-left`, 22px, Ink Charcoal) + exercise name in Subheading scale, Ink Charcoal. Cloud White background. No collapsing behavior.
- **Body:** `SingleChildScrollView` with vertical `Column` on Lavender Mist canvas.
- **BottomNavigationBar:** Hidden. This is a pushed detail screen.
- **FAB:** None.
- **PersistentFooterButtons:** "Start Exercise" — full-width coral pill button (Coral Bloom fill, Cloud White text, Subheading scale, weight 600, 9999px radius). 44dp minimum height. Positioned above safe-area-inset-bottom.

### Content Width

Full viewport width with 20dp horizontal padding. No max-width wrapper. Cards fill available width.

### Vertical Spacing

Content starts below the app bar. Sections separated by 24dp gaps. Content ends with enough bottom padding to clear the persistent footer button plus safe-area-inset-bottom.

## 7. Sections

### 7.1 Illustration Card

- **Description:** Full-width hero card displaying a large illustration of the exercise (e.g., a figure in a breathing pose or stretch position).
- **Widget type:** Cloud White card containing a centered illustration asset.
- **Container:** 32dp border-radius, prominent elevation, 32dp internal padding. Full width within horizontal padding.
- **Data requirements:** `Exercise.illustration` asset path.
- **Content:**
  - Illustration: centered, occupying ~70% of card width. Custom vector art depicting the exercise.
  - Gentle breathing animation: 4s cycle, `scale(1.0)` → `scale(1.015)` → `scale(1.0)`.
  - Exercise name: Heading scale, Ink Charcoal, centered below illustration.
  - Category tag: Micro scale, uppercase, Lilac Pulse text on Chip Mist pill, centered below name.
- **Interactive elements:** None (informational only).

### 7.2 Instructions

- **Description:** Numbered step-by-step guide walking the user through the exercise.
- **Widget type:** Cloud White card containing a `Column` of numbered step rows.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** `Exercise.steps` — List\<String\> of instruction steps.
- **Content:**
  - Section header: "Instructions" in Heading scale, Ink Charcoal, at top of card.
  - Each step: a `Row` with step number (Lilac Pulse circle badge, 28dp diameter, Caption scale Cloud White text centered) and step description (Body scale, Ink Charcoal) to the right.
  - 12dp vertical spacing between steps.
  - Ghost Divide separator between each step.
- **Interactive elements:** None (read-only content).

### 7.3 Duration & Difficulty

- **Description:** A row of metadata chips displaying exercise duration and difficulty level.
- **Widget type:** `Row` of pill-shaped chips. No card wrapper — chips sit on the Lavender Mist canvas.
- **Container:** No card. Chips rendered directly with 20dp horizontal screen padding, 8dp gap between chips.
- **Data requirements:** `Exercise.duration` for time display. Difficulty derived from exercise category or metadata.
- **Content:**
  - Duration chip: Lucide `clock` icon (16px, Lilac Pulse) + duration text (Data scale, Muted Quartz) on Chip Mist fill, 9999px radius.
  - Difficulty chip: Lucide `signal` icon (16px, Lilac Pulse) + difficulty text (Data scale, Muted Quartz) on Chip Mist fill, 9999px radius.
  - Minimum tap target: 44dp height including padding.
  - Padding: 0.5rem vertical, 1rem horizontal per chip.
- **Interactive elements:** None (informational only).

### 7.4 Benefits

- **Description:** A brief list of wellness benefits the user can expect from this exercise.
- **Widget type:** Cloud White card containing a `Column` of benefit items.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** `Exercise.benefits` — List\<String\> of benefit descriptions.
- **Content:**
  - Section header: "Benefits" in Heading scale, Ink Charcoal, at top of card.
  - Each benefit: a `Row` with a Lucide `check-circle` icon (18px, Field Green #6DC48A) and benefit text (Body scale, Ink Charcoal).
  - 12dp vertical spacing between benefit items.
- **Interactive elements:** None (read-only content).

## 8. Data

### Entities

**Exercise** (primary, loaded by `:id` route parameter)
- `id`: String — unique identifier
- `name`: String — exercise name (e.g., "Deep Breathing", "Prenatal Stretch")
- `category`: ExerciseCategory — breathing, stretching, meditation
- `duration`: Duration — estimated exercise time
- `steps`: List\<String\> — step-by-step instructions
- `benefits`: List\<String\> — wellness benefits
- `illustration`: String — asset path for exercise illustration

### Screen Data Flow

- Exercise entity is fetched by `id` from the exercise catalog (local reference data).
- All content is derived from a single Exercise entity — no joins or secondary queries required.
- The "Start Exercise" button initiates a guided timer/animation sequence using `Exercise.steps` and `Exercise.duration`.

## 9. Motion

### Entry Animations

- Illustration card enters via `translateY(12px)` → `translateY(0)` with opacity 0 → 1, spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`), 450ms.
- Illustration has perpetual breathing animation: 4s cycle, `scale(1.0)` → `scale(1.015)` → `scale(1.0)`.
- Instructions card enters with 80ms stagger delay after illustration, same spring animation.
- Duration & difficulty chips enter with 80ms stagger after instructions, opacity 0 → 1 with spring easing, 300ms.
- Benefits card enters with 80ms stagger after chips, same spring animation as instructions.

### Footer Button

- "Start Exercise" button fades in with opacity 0 → 1 over 300ms, 160ms delay after last content section.

### Page Transitions

- Forward navigation (push from mindfulness): content slides up 20px and fades in, 350ms spring.
- Back navigation (pop to mindfulness): content fades out, 180ms ease-out.

### Hero Animation

- If the exercise card in the mindfulness grid shares a hero tag with the illustration card, a shared-element hero transition animates the illustration between screens.

## 10. Accessibility

### Semantics Labels

- Screen: `Semantics(label: "Exercise detail: [exercise name]")`.
- Back button: `Semantics(label: "Go back to mindfulness", button: true)`.
- Illustration card: `Semantics(label: "Illustration for [exercise name]")`.
- Category badge: `Semantics(label: "Category: [category]")`.
- Instructions section: `Semantics(label: "Instructions")`.
- Each instruction step: `Semantics(label: "Step [n]: [step text]")`.
- Duration chip: `Semantics(label: "Duration: [duration]")`.
- Difficulty chip: `Semantics(label: "Difficulty: [level]")`.
- Benefits section: `Semantics(label: "Benefits")`.
- Each benefit: `Semantics(label: "[benefit text]")`.
- Start button: `Semantics(label: "Start [exercise name] exercise", button: true)`.

### Focus Order

1. Back button
2. App bar title
3. Illustration card (illustration + name + category)
4. Instructions heading, then each step sequentially
5. Duration chip, then difficulty chip
6. Benefits heading, then each benefit sequentially
7. "Start Exercise" footer button

### Contrast Notes

- Ink Charcoal (#2A2A3A) on Cloud White (#FFFFFF): contrast ratio ~13.5:1 — exceeds AAA. Used for exercise name, instructions, benefits.
- Muted Quartz (#8B8B9C) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for metadata at Data scale or larger.
- Cloud White text on Coral Bloom button: contrast ratio ~3.2:1 — meets AA for large text. Footer button uses Subheading scale with 44dp tap target.
- Lilac Pulse (#8B7ED8) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for step number badges and chip icons.
- Cloud White text on Lilac Pulse step number circle: contrast ratio ~3.5:1 — meets AA for large text at Caption scale.
- All interactive elements maintain 44x44dp minimum touch targets.

## 11. Anti-Patterns

- No emojis for exercise categories or step numbers — use Lucide icons and colored number badges
- No pure black (#000000) anywhere — use Ink Charcoal (#2A2A3A) as darkest value
- No glass morphism or backdrop blur — opaque Cloud White cards on Lavender Mist canvas
- No circular loading spinners — use skeleton shimmer loaders matching card dimensions
- No floating detached tab bar — bottom nav is hidden on this detail screen
- No hover-only interaction states — all interactions are tap-based
- No Inter, Poppins, Roboto, or Montserrat fonts — use Plus Jakarta Sans exclusively
- No linear easing on any animation — spring or ease-out only
- No gradient text on headings — flat color only
- No hard black drop-shadows — all shadows carry lilac tint per Pastel Elevation spec
- No `h-screen` — use `min-h-[100dvh]` for full-height sections
- No landscape layouts — portrait only, locked at app level
- No medical diagnostic language — exercises are for wellness, not treatment
- No fabricated health claims — avoid invented statistics about exercise benefits
