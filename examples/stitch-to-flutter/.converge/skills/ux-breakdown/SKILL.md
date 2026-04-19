# UX Breakdown Skill

Parse `.stitch/UX.md` and extract structured screen definitions with Flutter navigation architecture.

## Inputs
- `.stitch/UX.md` — UX specification

## Outputs
- `.stitch/SITE.md` — Human-readable navigation map
- `.stitch/screens.json` — Machine-readable screen definitions

## Procedure

1. Read `.stitch/UX.md` and identify all screens described
2. For each screen, extract: id, title, route, description, features, priority
3. Map the navigation architecture: bottom nav tabs, push routes, modal overlays
4. Write `.stitch/SITE.md` as a navigational hierarchy
5. Write `.stitch/screens.json` as a JSON array

## SITE.md Format

```markdown
# {App Name} — Navigation Map

## Bottom Navigation (ShellRoute)
- Home (/) — Main feed [tab: home icon]
- Browse (/browse) — Discovery and search [tab: search icon]
- Library (/library) — Personal bookshelf [tab: bookmark icon]
- Profile (/profile) — Settings and stats [tab: person icon]

## Push Routes (detail screens)
- Novel Detail (/novel/:id) <- tap card from Home, Browse, Library
- Chapter Reader (/novel/:id/chapter/:chapterId) <- tap chapter from Novel Detail

## Modal Overlays (bottom sheets & dialogs)
- Audio Player (overlay:audio-player) — Persistent mini player, expands to full sheet
- Sort Options (overlay:sort-options) — Bottom sheet with sort/filter controls
```

## screens.json Schema

```json
[
  {
    "id": "home-feed",
    "title": "Home Feed",
    "route": "/",
    "description": "Personalized home feed with continue reading and trending",
    "features": ["hero-card", "horizontal-scroll", "section-list", "pull-to-refresh"],
    "navType": "tab",
    "priority": 1
  },
  {
    "id": "novel-detail",
    "title": "Novel Detail",
    "route": "/novel/:id",
    "description": "Full novel info with chapter list and reading progress",
    "features": ["sliver-app-bar", "hero-transition", "sticky-bottom-bar"],
    "navType": "push",
    "priority": 1
  },
  {
    "id": "audio-player",
    "title": "Audio Player",
    "route": "overlay:audio-player",
    "description": "Persistent mini player that expands to full bottom sheet",
    "features": ["draggable-sheet", "playback-controls", "progress-slider"],
    "navType": "overlay",
    "priority": 2
  }
]
```

## Navigation Rules

### GoRouter Structure
- **ShellRoute** wraps bottom navigation tabs — preserves tab state across switches
- **GoRoute** children of ShellRoute for each tab destination
- **Nested GoRoute** for detail screens pushed within a tab's navigation stack

### Route Types
- **Tab routes** (`navType: "tab"`) — top-level routes under ShellRoute (`/`, `/browse`, `/library`, `/profile`)
- **Push routes** (`navType: "push"`) — detail screens pushed onto the stack (`/novel/:id`, `/novel/:id/chapter/:chapterId`)
- **Overlay routes** (`navType: "overlay"`) — bottom sheets and dialogs, `overlay:` prefix

### Screen ID Rules
- Screen `id` must be unique, kebab-case
- Routes use GoRouter format: `/path/:param`
- Tab screens: top-level routes under ShellRoute
- Detail screens: nested routes with path parameters
- Overlays: `overlay:` prefix (`overlay:audio-player`)
- Priority: 1 = critical, 2 = important, 3 = nice-to-have
