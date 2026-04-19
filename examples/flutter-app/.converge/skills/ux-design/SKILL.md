# UX Design Skill

Generate a complete UX specification for a Flutter mobile application. Think natively in mobile — Scaffolds, navigators, gestures, bottom sheets — not web pages adapted for small screens.

## Inputs

- `PRD.md` — Product Requirements Document

## Procedure

1. **Read PRD** — Understand the app's purpose, features, user personas
2. **Define Vibe** — Establish the visual personality (e.g., "warm literary", "sleek minimal", "playful bright")
3. **Design Screens** — Define each screen as a Flutter Scaffold with:
   - Purpose and user intent
   - Scaffold chrome (AppBar, BottomNavigationBar, FAB)
   - Body layout and scroll behavior
   - Data displayed
   - User interactions and gestures
   - Navigation flows (push, pop, present sheet)
4. **Data Context** — List data entities and relationships
5. **Design Tokens** — Recommend colors, typography, spacing, motion

## Output

Write `.stitch/UX.md` with these sections:

### Part 1: Project Overview
- App name, description, platform (Flutter mobile)
- Core identity (3-4 adjectives)
- User personas summary

### Part 2: Vibe
- Visual atmosphere description
- Color mood (warm/cool, light/dark)
- Typography character (modern/classic, rounded/sharp)
- Motion personality (bouncy/smooth, fast/gentle)

### Part 3: Screens
For each screen:
- **Name** and GoRouter route
- **Purpose** — Why this screen exists
- **Scaffold** — AppBar config, bottom nav visibility, FAB placement
- **Body** — Scroll type (ListView, CustomScrollView with Slivers, PageView, none)
- **Sections** — Visual blocks within the body
- **Data** — What entities are shown, loaded from which providers
- **Interactions** — Taps (push detail), swipes (dismiss, page), pulls (refresh), long-press (context menu)
- **Transitions** — How user arrives (push, tab switch, bottom sheet present) and leaves (pop, swipe back)

### Part 4: Navigation Architecture
- **Navigator structure** — GoRouter with ShellRoute for bottom nav
- **Bottom Navigation** — Tab destinations (3-5), icons, labels
- **Push routes** — Card tap → detail screen, list item → reader
- **Modal routes** — Bottom sheets for quick actions, dialogs for confirmations
- **Deep links** — URI patterns for each route

### Part 5: Data Context
- Entity list with key fields
- Relationships between entities
- Which screens consume which entities

### Part 6: Design Tokens
- Color palette recommendations (Material 3 seed color)
- Typography scale (Google Fonts recommendation)
- Spacing rhythm (base 8dp)
- Corner radius scale
- Elevation levels (Material 3 tonal elevation)
- Animation curves and durations

## Flutter Mobile Design Principles

- Every screen is a `Scaffold` — AppBar, body, optional bottom nav and FAB
- Bottom navigation for primary destinations (max 5 tabs) using `ShellRoute`
- Detail screens push on top of the navigation stack (`context.push`)
- Quick actions use bottom sheets (`showModalBottomSheet`), not separate screens
- Tab content uses `DefaultTabController` + `TabBar` + `TabBarView`
- Scrollable lists use `CustomScrollView` with `SliverAppBar` for collapsing headers
- Pull-to-refresh via `RefreshIndicator` on scrollable content
- Safe areas respected — content never hidden behind system UI
- Touch targets minimum 48dp — all tappable elements
- Thumb zone awareness — primary actions in bottom half of screen
- Horizontal scroll for category chips, carousels, and content previews
- Hero animations for shared-element transitions between list and detail
