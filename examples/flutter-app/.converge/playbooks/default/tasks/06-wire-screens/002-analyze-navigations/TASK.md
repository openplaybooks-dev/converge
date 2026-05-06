---
id: 002-analyze-navigations
title: "Analyze Navigations — Build Navigation Manifest"
description: Scan screens/widgets, assign elementIds, insert `// @converge:element <elementId>` in Dart before each handler, and write navigations.json
skill: flutter-implementing-navigation-and-routing
blocking: true
depends_on:
  - 001-connect-providers
tags:
  - navigation
  - analysis
inputs:
  - .stitch/screens.json
  - lib/screens/**/*.dart
  - lib/widgets/**/*.dart
  - lib/router/app_router.dart
outputs:
  - navigations.json
  - lib/screens/**/*.dart
  - lib/widgets/**/*.dart
checks:
  - id: manifest-exists
    cmd: test -f navigations.json
    description: navigations.json was created
  - id: manifest-has-screens
    cmd: "node -e \"const n=JSON.parse(require('fs').readFileSync('navigations.json','utf-8')); process.exit(n.screens && n.screens.length >= 5 ? 0 : 1)\""
    description: Manifest contains at least 5 screens
  - id: manifest-has-elements
    cmd: "node -e \"const n=JSON.parse(require('fs').readFileSync('navigations.json','utf-8')); const total=n.screens.reduce((s,sc)=>s+sc.elements.length,0); process.exit(total >= 10 ? 0 : 1)\""
    description: Manifest contains at least 10 interactive elements total
  - id: every-element-has-id
    cmd: "node -e \"const n=JSON.parse(require('fs').readFileSync('navigations.json','utf-8')); const ok=n.screens.every(s=>s.elements.every(e=>e.elementId)); process.exit(ok ? 0 : 1)\""
    description: Every element has a unique elementId
---

# Analyze Navigations — Build Navigation Manifest

Scan every screen and widget in `lib/screens/` and `lib/widgets/`, extract all interactive elements, write `navigations.json`, and **edit Dart sources** so each listed handler is preceded by a stable marker for downstream wire checks.

## Steps

1. Read `lib/router/app_router.dart` to get the route table
2. Read `.stitch/screens.json` for screen metadata (id, route, navType)
3. For each screen directory in `lib/screens/`:
   a. Read the screen file and all `widgets/*.dart` files
   b. Find every interactive element:
      - `onDestinationSelected` (bottom nav)
      - `onPressed` (buttons, FABs, icon buttons)
      - `onTap` (cards, list tiles, ink wells)
      - `onChanged` / `onSelected` (tabs, chips, toggles)
   c. Classify each element's current state:
      - `"wired"` — has real logic (calls `context.go`, `context.push`, `ref.read`, `setState`, etc.)
      - `"empty"` — is `null`, `() {}`, or comment-only body
      - `"stub"` — has a TODO or placeholder comment
   d. For elements that should navigate, determine the target route from context
   e. Assign a unique `elementId` to each element using the pattern: `{widgetName}-{handlerType}-{index}`
      - e.g. `StatCard-onTap-1`, `BottomNavBar-onDestinationSelected-1`, `FAB-onPressed-1`
   f. **Dart markers (required):** For each element, edit its `file` and insert a new line **immediately above** the line that declares the handler property matching `type` (e.g. `onPressed:`, `onTap:`, `onDestinationSelected:`). The inserted line must be exactly: `// @converge:element <elementId>` (same `elementId` as in the manifest). If that exact marker is already present for that `elementId`, do not insert a duplicate.
   g. Describe what the handler **should do** in the `action` field — this tells downstream tasks exactly what to implement

4. Write `navigations.json` with this structure:

```json
{
  "generatedAt": "2026-04-19T...",
  "bottomNavRoutes": ["/home", "/progress", "/health-log", "/mood", "/education"],
  "screens": [
    {
      "id": "home",
      "route": "/home",
      "screenFile": "lib/screens/home/home_screen.dart",
      "widgetFiles": ["lib/screens/home/widgets/stat_card.dart"],
      "elements": [
        {
          "elementId": "BottomNav-onDestinationSelected-1",
          "file": "lib/screens/home/home_screen.dart",
          "line": 238,
          "type": "onDestinationSelected",
          "widget": "NavigationBar",
          "status": "wired",
          "action": "context.go to route by index",
          "target": "/home, /progress, /health-log, /mood, /education"
        },
        {
          "elementId": "WeightStatCard-onTap-1",
          "file": "lib/screens/home/home_screen.dart",
          "line": 180,
          "type": "onTap",
          "widget": "StatCard",
          "status": "wired",
          "action": "Navigate to weight screen",
          "target": "/weight"
        },
        {
          "elementId": "FAB-onPressed-1",
          "file": "lib/screens/home/home_screen.dart",
          "line": 95,
          "type": "onPressed",
          "widget": "FloatingActionButton",
          "status": "empty",
          "action": "Show quick-add bottom sheet",
          "target": null
        }
      ]
    }
  ]
}
```

The `line` field is **optional** and may be omitted or kept as an approximate 1-based line for humans; downstream **003** checks use `elementId` and `// @converge:element` markers in Dart, not `line`.

## Rules

- Include ALL interactive elements, not just broken ones
- Mark status honestly — if a handler is `(index) {}` that is `"empty"`, not `"wired"`
- A handler containing only a comment like `// Handle tab navigation` is `"empty"`
- **Every listed element MUST have** `// @converge:element <elementId>` on the line immediately above its handler property in the Dart `file` (inserted in this task); do not rely on `line` for automation
- Include `bottomNavRoutes` — the ordered list of routes for bottom nav index mapping
- Every element MUST have a unique `elementId` — downstream Seed uses this as the task ID
- The `action` field MUST describe what the handler should do, not just its type
- The `widget` field should name the enclosing widget class (e.g. `StatCard`, `FloatingActionButton`, `NavigationBar`)
