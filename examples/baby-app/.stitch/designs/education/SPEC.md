# Screen Specification: Education

## 1. Screen Title

Education

## 2. Purpose

Provide a browsable catalog of trusted educational content about maternal care, nutrition, body changes, and baby development. Acts as the primary learning hub where users discover, filter, search, and bookmark articles organized by topic, with a dedicated section for quick access to saved content.

## 3. Route

`/education`

## 4. Widget Name

`EducationScreen`

## 5. Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary Canvas | Lavender Mist (#EDE8F7) | Screen background |
| Card Surface | Cloud White (#FFFFFF) | All content cards, article cards |
| Primary Accent | Coral Bloom (#F28B8B) | Featured article highlight, bookmark active icon |
| Coral Whisper | rgba(242, 139, 139, 0.12) | Active topic chip background |
| Secondary Accent | Lilac Pulse (#8B7ED8) | Topic icons, metadata accents |
| Lilac Whisper | rgba(139, 126, 216, 0.14) | Selected chip emphasis |
| Text Primary | Ink Charcoal (#2A2A3A) | Article titles, section headings |
| Text Secondary | Muted Quartz (#8B8B9C) | Topic labels, read time metadata, bookmark counts |
| Divider | Ghost Divide rgba(42, 42, 58, 0.06) | Separators between article list items |
| Chip Background | Chip Mist rgba(139, 126, 216, 0.08) | Inactive topic chip fill |
| Success | Field Green (#6DC48A) | Bookmark confirmation feedback |

### Typography

| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Screen title | Display (2rem) | 800 | "Learn" in pinned app bar |
| Section headers | Heading (1.5rem) | 700 | "Featured", "Bookmarked", topic group headings |
| Card titles | Subheading (1.125rem) | 600 | Article titles in cards |
| Body text | Body (1rem) | 400 | Article preview text |
| Metadata | Data (0.875rem) | 500 | Topic tags, read time estimates |
| Helper text | Caption (0.8125rem) | 400 | Card subtitles, chip labels |
| Badges | Micro (0.6875rem) | 700 | Topic badge text (uppercase) |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| Screen horizontal padding | 20dp (1.25rem) | Left/right content inset |
| Section gap | 24dp | Between topic chips, featured card, article list, bookmarked section |
| Card internal padding | 20dp | Inside article cards |
| Featured card padding | 32dp | Extra padding inside featured article card |
| List item gap | 12dp | Between article list items |
| Chip spacing | 8dp | Between topic chips in horizontal scroll |

### Corner Radius

| Token | Value | Usage |
|-------|-------|-------|
| Featured card | 32dp (2rem) | Featured article hero card |
| Article cards | 24dp (1.5rem) | Individual article list cards |
| Topic chips | 9999px | Fully rounded filter chips |
| Search field | 16dp (1rem) | Expanded search input |

### Elevation

| Token | Shadow | Usage |
|-------|--------|-------|
| Prominent | 0 8px 32px rgba(139, 126, 216, 0.14) | Featured article card |
| Standard | 0 4px 20px rgba(139, 126, 216, 0.12) | Article list cards, bookmarked section |
| Subtle | 0 2px 8px rgba(139, 126, 216, 0.08) | Card press state |
| Bottom Nav | 0 -4px 20px rgba(139, 126, 216, 0.08) | Tab bar |

## 6. Layout Rules

### Scaffold

- **AppBar:** `SliverAppBar` with title "Learn" in Display scale, Ink Charcoal, pinned. Cloud White background. Trailing search action icon (Lucide `search`, 22px, Muted Quartz).
- **Body:** `CustomScrollView` containing sliver-based sections on Lavender Mist canvas.
- **BottomNavigationBar:** Visible. Learn tab active. Cloud White background, Coral Bloom active icon/label on Coral Whisper pill, Muted Quartz inactive.
- **FAB:** None.

### Content Width

Full viewport width with 20dp horizontal padding. No max-width wrapper. Cards fill available width.

### Vertical Spacing

Content starts 0.75rem below status bar safe-area inset. Sections separated by 24dp gaps. Content ends 0.75rem above tab bar.

## 7. Sections

### 7.1 Topic Chips

- **Description:** Horizontal scrollable row of filter chips for article topics. Allows users to filter the article list by subject area.
- **Widget type:** `SliverToBoxAdapter` containing a horizontal `ListView` of `ChoiceChip` widgets.
- **Container:** No card wrapper. Chips sit directly on the Lavender Mist canvas with 20dp horizontal padding. Horizontal scroll with content peeking off-screen right to signal scrollability.
- **Data requirements:** Static topic list: "All", "Nutrition", "Body Changes", "Maternal Care", "Baby Development".
- **Content:**
  - Each chip: pill-shaped (9999px radius), Chip Mist background when inactive, Lilac Whisper background with Lilac Pulse text (weight 600) when selected.
  - Text in Caption scale, Muted Quartz (inactive) or Lilac Pulse (active).
  - "All" is selected by default on screen load.
  - Minimum tap target: 44px height including padding.
  - Padding: 0.5rem vertical, 1rem horizontal per chip. 8dp gap between chips.
- **Interactive elements:**
  - Tap chip → select that topic, deselect others, filter article list and featured card to matching topic (or show all).

### 7.2 Featured Article Card

- **Description:** Large hero-style card highlighting a recommended article with illustration, title, and topic tag. Draws user attention to a single featured piece of content.
- **Widget type:** Cloud White card containing a `Column` with illustration area, article title, and topic metadata.
- **Container:** 32dp border-radius, prominent elevation, 32dp internal padding. Full width within horizontal padding.
- **Data requirements:** One `Article` entity (featured/recommended for current context). Fields: `title`, `topic`, `body` (preview), illustration asset.
- **Content:**
  - Illustration: centered, occupying ~70% of card width. Custom vector art related to the article topic. Gentle breathing animation: 4s cycle, scale 1.0 → 1.015 → 1.0.
  - Article title: Heading scale, Ink Charcoal, below illustration.
  - Topic tag: Micro scale, uppercase, Lilac Pulse text on Chip Mist pill.
  - Preview text: Caption scale, Muted Quartz, 2-line clamp.
- **Interactive elements:**
  - Tap card → push to article reader screen (`/education/article/:id`).

### 7.3 Article List

- **Description:** Vertical list of article cards grouped by topic, separated by Ghost Divide lines. Filtered by the active topic chip selection.
- **Widget type:** `SliverList` with `SliverChildBuilderDelegate` rendering article cards separated by Ghost Divide dividers.
- **Container:** Each card is Cloud White, 24dp border-radius, standard elevation, 20dp internal padding. Full width within horizontal padding.
- **Data requirements:** List of `Article` entities filtered by selected topic. Each article: `id`, `title`, `topic`, `body` (preview snippet), `isBookmarked`, illustration asset.
- **Content per card:**
  - Left: Illustration thumbnail (64dp square, 16dp corner radius).
  - Right column:
    - Article title: Subheading scale, Ink Charcoal. 2-line clamp.
    - Topic: Caption scale, Muted Quartz.
    - Bookmark indicator: Lucide `bookmark` icon (18px), Coral Bloom when bookmarked, Muted Quartz when not.
  - Ghost Divide separator (1px) between cards.
- **Interactive elements:**
  - Tap article card → push to article reader screen (`/education/article/:id`).
  - Long press article → toggle bookmark state.
  - Press state: shadow softens to subtle elevation, card compresses `translateY(1px)`.

### 7.4 Bookmarked Section

- **Description:** Dedicated section showing saved/bookmarked articles for quick access. Only visible when the user has bookmarked articles.
- **Widget type:** `SliverToBoxAdapter` containing a `Column` with section heading and horizontal `ListView` of bookmarked article cards.
- **Container:** Section heading sits on canvas. Bookmarked cards are Cloud White, 24dp border-radius, standard elevation, 20dp internal padding. Horizontal scroll with cards peeking off-screen right.
- **Data requirements:** List of `Article` entities where `isBookmarked == true`.
- **Content:**
  - Section heading: "Bookmarked" in Heading scale, Ink Charcoal, left-aligned with 20dp horizontal padding.
  - Each bookmarked card (fixed width ~200dp):
    - Illustration thumbnail at top (~120dp height, 16dp top corner radius).
    - Article title: Subheading scale, Ink Charcoal, 2-line clamp.
    - Topic: Caption scale, Muted Quartz.
  - If no bookmarked articles, this section is hidden entirely.
- **Interactive elements:**
  - Tap bookmarked card → push to article reader screen (`/education/article/:id`).

## 8. Data

### Entities

**Article** (reference data, primary)
- `id`: String — unique identifier
- `title`: String — article title (e.g., "Nutrition in Your First Trimester")
- `topic`: ArticleTopic — nutrition, body_changes, maternal_care, baby_development
- `body`: String — full article content (rich text)
- `isBookmarked`: bool — whether the user has saved this article
- `illustration`: String — asset path for article illustration

### Screen Data Flow

- Article catalog is loaded as reference data and filtered client-side by topic chip selection.
- Featured article is determined by a recommendation rule (e.g., first article in selected topic, or a daily rotation).
- Bookmarked section queries all `Article` entities where `isBookmarked == true`.
- Search action opens an inline search field that filters articles by title and body content match.

## 9. Motion

### Entry Animations

- Topic chips row fades in with opacity 0 → 1 over 300ms, spring easing.
- Featured article card enters via `translateY(12px)` → `translateY(0)` with opacity 0 → 1, spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`), 450ms.
- Featured card illustration has perpetual breathing animation: 4s cycle, `scale(1.0)` → `scale(1.015)` → `scale(1.0)`.
- Article list cards cascade with 80ms stagger delay between cards. Each enters via `translateY(12px)` → `translateY(0)` with opacity 0 → 1, spring easing, 450ms.
- Bookmarked section enters with 80ms stagger after the last visible list card, same spring animation.

### Topic Filter Transition

- When a topic chip is tapped, article list cards fade out over 180ms ease-out, then filtered results fade in with the staggered reveal pattern (80ms per card, spring easing).

### Card Press States

- Article list cards and featured card: shadow softens to subtle elevation (`0 2px 8px rgba(139, 126, 216, 0.08)`) and card compresses `translateY(1px)` over 100ms on press.

### Page Transitions

- Forward navigation (tap article → reader): content slides up 20px and fades in, 350ms spring.
- Back navigation: content fades out, 180ms ease-out.
- Search expand: search field slides in from right with spring easing, 300ms.

## 10. Accessibility

### Semantics Labels

- Screen: `Semantics(label: "Education articles")`.
- Topic chips: `Semantics(label: "[topic] filter, [selected/not selected]", button: true)` for each chip.
- Featured article card: `Semantics(label: "Featured article: [title], [topic]", button: true)`.
- Featured illustration: `Semantics(label: "Illustration for [article title]")`.
- Article list cards: `Semantics(label: "[title], [topic], [bookmarked/not bookmarked]", button: true)` for each card.
- Bookmarked section heading: `Semantics(label: "Bookmarked articles")`.
- Bookmarked cards: `Semantics(label: "Bookmarked: [title], [topic]", button: true)`.
- Search icon: `Semantics(label: "Search articles", button: true)`.
- Bottom navigation tabs: each tab labeled with its name.

### Focus Order

1. App bar title
2. Search action icon
3. Topic chips (left to right)
4. Featured article card
5. Article list cards (top to bottom)
6. Bookmarked section heading and cards (left to right)
7. Bottom navigation tabs

### Contrast Notes

- Ink Charcoal (#2A2A3A) on Cloud White (#FFFFFF): contrast ratio ~13.5:1 — exceeds AAA. Used for all primary text and article titles.
- Muted Quartz (#8B8B9C) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for metadata at Data scale or larger.
- Coral Bloom (#F28B8B) on Cloud White: contrast ratio ~3.2:1 — meets AA for large text. Used for bookmark icon active state.
- Lilac Pulse (#8B7ED8) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for topic icons and selected chip text.
- All interactive elements maintain 44x44dp minimum touch targets.

## 11. Anti-Patterns

- No emojis for topics or content markers — use custom vector illustrations and Lucide icons
- No pure black (#000000) anywhere — use Ink Charcoal (#2A2A3A) as darkest value
- No glass morphism or backdrop blur — opaque Cloud White cards on Lavender Mist canvas
- No circular loading spinners — use skeleton shimmer loaders matching card dimensions
- No 3-column grids — article list is single-column vertical, bookmarked section is horizontal scroll
- No floating detached tab bar — bottom nav is flush, opaque, grounded
- No hover-only interaction states — all interactions are tap-based
- No Inter, Poppins, Roboto, or Montserrat fonts — use Plus Jakarta Sans exclusively
- No linear easing on any animation — spring or ease-out only
- No gradient text on headings — flat color only
- No hard black drop-shadows — all shadows carry lilac tint per Pastel Elevation spec
- No `h-screen` — use `min-h-[100dvh]` for full-height sections
- No landscape layouts — portrait only, locked at app level
- No fabricated medical or health claims — educational content references trusted sources only
- No AI copywriting cliches — avoid "Elevate", "Seamless", "Unleash", "Next-Gen" language
- No broken Unsplash links — use `picsum.photos` or inline SVG illustrations
