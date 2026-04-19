# Screen Specification: Article Reader

## 1. Screen Title

Article Reader

## 2. Purpose

Display a single educational article in a focused, distraction-free reading view. Users arrive here from the Education screen after tapping an article card. The screen presents the full article content with hero illustration, metadata, rich text body, and related article recommendations to encourage continued learning.

## 3. Route

`/education/article/:id`

## 4. Widget Name

`ArticleReaderScreen`

## 5. Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary Canvas | Lavender Mist (#EDE8F7) | Screen background behind cards |
| Card Surface | Cloud White (#FFFFFF) | Hero image card, article body card, related articles cards |
| Primary Accent | Coral Bloom (#F28B8B) | Bookmark active icon, related article highlight |
| Coral Whisper | rgba(242, 139, 139, 0.12) | Bookmark icon tap feedback area |
| Secondary Accent | Lilac Pulse (#8B7ED8) | Topic chip accent, metadata icons |
| Text Primary | Ink Charcoal (#2A2A3A) | Article title, subheadings, body text |
| Text Secondary | Muted Quartz (#8B8B9C) | Topic label, read time, metadata |
| Divider | Ghost Divide rgba(42, 42, 58, 0.06) | Separator between body and related articles |
| Chip Background | Chip Mist rgba(139, 126, 216, 0.08) | Topic chip fill |

### Typography

| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Article title | Display (2rem) | 800 | Main article heading |
| Subheadings | Heading (1.5rem) | 700 | In-article section headings, "Related Articles" heading |
| Card titles | Subheading (1.125rem) | 600 | Related article card titles |
| Body text | Body (1rem) | 400 | Article paragraph content |
| Metadata | Data (0.875rem) | 500 | Topic tag, read time estimate |
| Helper text | Caption (0.8125rem) | 400 | Related article topic labels |
| Badges | Micro (0.6875rem) | 700 | Topic badge text (uppercase) |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| Screen horizontal padding | 20dp (1.25rem) | Left/right content inset |
| Section gap | 24dp | Between hero image, title block, body, related articles |
| Card internal padding | 20dp | Inside article body card and related article cards |
| Hero card padding | 0dp | Hero image is edge-to-edge within the card |
| Related card gap | 12dp | Between related article cards in horizontal scroll |

### Corner Radius

| Token | Value | Usage |
|-------|-------|-------|
| Hero image card | 32dp (2rem) | Full-width hero illustration card |
| Body content card | 24dp (1.5rem) | Article body container |
| Related article cards | 24dp (1.5rem) | Individual related article cards |
| Topic chip | 9999px | Fully rounded topic pill |

### Elevation

| Token | Shadow | Usage |
|-------|--------|-------|
| Prominent | 0 8px 32px rgba(139, 126, 216, 0.14) | Hero image card |
| Standard | 0 4px 20px rgba(139, 126, 216, 0.12) | Article body card, related article cards |
| Subtle | 0 2px 8px rgba(139, 126, 216, 0.08) | Card press states |

## 6. Layout Rules

### Scaffold

- **AppBar:** Standard app bar with back button (Lucide `arrow-left`, 22px, Ink Charcoal) left-aligned, article title truncated in Subheading scale center/left, and bookmark action icon (Lucide `bookmark`, 22px) right-aligned. Cloud White background. No elevation when at scroll top; subtle elevation on scroll.
- **Body:** `SingleChildScrollView` containing a vertical `Column` of sections on Lavender Mist canvas.
- **BottomNavigationBar:** Hidden. This is a push route from the Education screen.
- **FAB:** None.

### Content Width

Full viewport width with 20dp horizontal padding. No max-width wrapper. Cards fill available width.

### Vertical Spacing

Content starts 0.75rem below status bar safe-area inset. Sections separated by 24dp gaps. Scroll extends to bottom safe area.

## 7. Sections

### 7.1 Hero Image

- **Description:** Full-width illustration card at the top of the screen, establishing the visual theme of the article.
- **Widget type:** Cloud White card containing a single illustration asset, displayed edge-to-edge within the card.
- **Container:** 32dp border-radius, prominent elevation, no internal padding (illustration fills the card). Full width within horizontal padding.
- **Data requirements:** Article `illustration` asset path. Falls back to a topic-based placeholder illustration if unavailable.
- **Content:**
  - Illustration: fills card width, aspect ratio ~16:9 (~200dp height). Custom vector art matching the article topic.
  - No caption or overlay text on the hero image.
- **Interactive elements:** None. The hero image is purely decorative.

### 7.2 Title & Metadata

- **Description:** Article title, topic chip, and read time displayed below the hero image. Establishes the article identity and sets reading expectations.
- **Widget type:** `Column` widget (no card wrapper, sits directly on Lavender Mist canvas within horizontal padding).
- **Container:** No card. Content sits on canvas with 20dp horizontal padding.
- **Data requirements:** Article `title`, `topic` (ArticleTopic enum), calculated read time (based on body word count).
- **Content:**
  - Article title: Display scale (2rem), weight 800, Ink Charcoal. Left-aligned. No line clamp — full title displayed.
  - Below title (8dp gap): horizontal row containing topic chip and read time.
  - Topic chip: Micro scale, uppercase, Lilac Pulse text on Chip Mist pill (9999px radius). Padding: 0.5rem vertical, 1rem horizontal.
  - Read time: Data scale, Muted Quartz, preceded by Lucide `clock` icon (14px, Muted Quartz). Format: "[n] min read".
  - 12dp gap between topic chip and read time.
- **Interactive elements:** None.

### 7.3 Article Body

- **Description:** The main article content rendered as rich text with subheadings, paragraphs, and inline tips. This is the core reading experience.
- **Widget type:** Cloud White card containing a `Column` of rich text widgets.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding. Full width within horizontal padding.
- **Data requirements:** Article `body` (String, rich text content with subheadings and paragraphs).
- **Content:**
  - Subheadings within article: Heading scale (1.5rem), weight 700, Ink Charcoal. 24dp top margin before each subheading, 12dp below.
  - Paragraph text: Body scale (1rem), weight 400, Ink Charcoal. Line height 1.5. 12dp gap between paragraphs.
  - Inline tips: Soft Ivory (#FDF9F8) background with 16dp border-radius, 16dp padding. Tip text in Body scale, Lilac Pulse left border (3px). Contains a tip label in Data scale, Lilac Pulse, weight 600.
  - No images within the body — illustrations are limited to the hero card.
- **Interactive elements:** None. The body is read-only content.

### 7.4 Related Articles

- **Description:** Horizontal scrollable row of related article cards at the bottom, encouraging continued reading on related topics.
- **Widget type:** `Column` containing a section heading and a horizontal `ListView` of article cards.
- **Container:** Section heading sits on canvas. Related cards are Cloud White, 24dp border-radius, standard elevation, 20dp internal padding. Horizontal scroll with cards peeking off-screen right to signal scrollability.
- **Data requirements:** List of `Article` entities related by topic (same `topic` as current article, excluding the current article). 3–5 articles.
- **Content:**
  - Section heading: "Related Articles" in Heading scale, Ink Charcoal, left-aligned with 20dp horizontal padding. 24dp above the scroll row.
  - Ghost Divide separator (1px) above the section heading, full width.
  - Each related card (fixed width ~180dp):
    - Illustration thumbnail at top (~100dp height, 16dp top corner radius clipped).
    - Article title: Subheading scale, Ink Charcoal, 2-line clamp.
    - Topic: Caption scale, Muted Quartz.
  - 12dp gap between cards. 20dp left padding on first card, 20dp right padding on last card.
- **Interactive elements:**
  - Tap related article card → push to new article reader screen (`/education/article/:id`), replacing current view in the navigation stack.
  - Press state: shadow softens to subtle elevation, card compresses `translateY(1px)`.

## 8. Data

### Entities

**Article** (reference data, primary)
- `id`: String — unique identifier
- `title`: String — article title (e.g., "Understanding Your First Trimester")
- `topic`: ArticleTopic — nutrition, body_changes, maternal_care, baby_development
- `body`: String — full article content (rich text with subheadings and paragraphs)
- `isBookmarked`: bool — whether the user has saved this article
- `illustration`: String — asset path for article hero illustration

### Screen Data Flow

- Article entity is loaded by `id` from the route parameter.
- Bookmark state is toggled via the app bar bookmark action and persisted locally.
- Related articles are queried by matching `topic` to the current article's topic, excluding the current article `id`.
- Read time is calculated client-side from the body word count (average 200 words per minute).

## 9. Motion

### Entry Animations

- Hero image card enters via `translateY(12px)` → `translateY(0)` with opacity 0 → 1, spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`), 450ms.
- Title and metadata fade in with opacity 0 → 1 over 300ms, 80ms delay after hero.
- Article body card enters via `translateY(12px)` → `translateY(0)` with opacity 0 → 1, spring easing, 450ms, 160ms delay after hero.
- Related articles section enters with 80ms stagger after body card settles, same spring animation per card.

### Bookmark Toggle

- Bookmark icon: on toggle, icon scales from 1.0 → 1.2 → 1.0 with spring easing, 300ms. Color crossfades between Muted Quartz (unbookmarked) and Coral Bloom (bookmarked) over 200ms.

### Card Press States

- Related article cards: shadow softens to subtle elevation (`0 2px 8px rgba(139, 126, 216, 0.08)`) and card compresses `translateY(1px)` over 100ms on press.

### Page Transitions

- Forward navigation (entering this screen): content slides up 20px and fades in, 350ms spring.
- Back navigation (pop to education list): content fades out, 180ms ease-out.
- Tap related article: crossfade transition to new article content, 300ms.

## 10. Accessibility

### Semantics Labels

- Screen: `Semantics(label: "Article reader")`.
- Back button: `Semantics(label: "Go back to articles", button: true)`.
- Bookmark action: `Semantics(label: "Bookmark article, [bookmarked/not bookmarked]", button: true)`.
- Hero image: `Semantics(label: "Illustration for [article title]")`.
- Article title: `Semantics(label: "[article title]", header: true)`.
- Topic chip: `Semantics(label: "Topic: [topic name]")`.
- Read time: `Semantics(label: "[n] minute read")`.
- Article body subheadings: `Semantics(header: true)` for each subheading.
- Related articles section: `Semantics(label: "Related articles")`.
- Related article cards: `Semantics(label: "[title], [topic]", button: true)`.

### Focus Order

1. Back button
2. App bar title
3. Bookmark action icon
4. Hero image
5. Article title
6. Topic chip and read time
7. Article body content (subheadings and paragraphs in reading order)
8. Related articles heading
9. Related article cards (left to right)

### Contrast Notes

- Ink Charcoal (#2A2A3A) on Cloud White (#FFFFFF): contrast ratio ~13.5:1 — exceeds AAA. Used for article title, body text, subheadings.
- Muted Quartz (#8B8B9C) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for metadata at Data scale or larger.
- Coral Bloom (#F28B8B) on Cloud White: contrast ratio ~3.2:1 — meets AA for large text. Used for bookmark active icon.
- Lilac Pulse (#8B7ED8) on Chip Mist: sufficient contrast for Micro scale uppercase text.
- All interactive elements (back button, bookmark icon, related article cards) maintain 44x44dp minimum touch targets.

## 11. Anti-Patterns

- No emojis in article chrome or metadata — use Lucide icons and vector illustrations
- No pure black (#000000) anywhere — use Ink Charcoal (#2A2A3A) as darkest value
- No glass morphism or backdrop blur — opaque Cloud White cards on Lavender Mist canvas
- No circular loading spinners — use skeleton shimmer loaders matching content layout
- No floating detached elements — back button and bookmark sit in the standard app bar
- No hover-only interaction states — all interactions are tap-based
- No Inter, Poppins, Roboto, or Montserrat fonts — use Plus Jakarta Sans exclusively
- No linear easing on any animation — spring or ease-out only
- No gradient text on headings — flat color only
- No hard black drop-shadows — all shadows carry lilac tint per Pastel Elevation spec
- No `h-screen` — use `min-h-[100dvh]` for full-height sections
- No landscape layouts — portrait only
- No fabricated medical or health claims in article content
- No AI copywriting cliches — avoid "Elevate", "Seamless", "Unleash", "Next-Gen" language
- No broken Unsplash links — use `picsum.photos` or inline SVG illustrations
- No sidebar or drawer navigation — back button pops to Education screen only
