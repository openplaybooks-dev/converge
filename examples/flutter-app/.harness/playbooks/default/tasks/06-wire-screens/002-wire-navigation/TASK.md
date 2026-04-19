---
id: 002-wire-navigation
title: "Wire Navigation — All Links Navigate"
description: Make BottomNavigationBar, tappable items, and back buttons navigate via GoRouter
skill: flutter-implementing-navigation-and-routing
blocking: true
dependencies:
  - 001-connect-providers
tags:
  - navigation
  - go-router
  - links
inputs:
  - .stitch/screens.json
  - lib/screens/**/*.dart
outputs:
  - lib/screens/**/*.dart
checks:
  - id: no-todo-navigation
    cmd: "! grep -rqE 'TODO.*nav|// navigate' lib/screens/ lib/widgets/"
    description: No TODO navigation markers remain
  - id: dart-analysis-valid
    cmd: dart analyze --no-fatal-infos lib/
    description: All code passes analysis
---

# Wire Navigation — All Links Navigate

Read the **flutter-implementing-navigation-and-routing** skill for GoRouter declarative routing, `context.go()` vs `context.push()`, nested navigation with `ShellRoute`, `PopScope` for back-button interception, and passing data via route constructors.

User can navigate between every screen. BottomNavigationBar works, tappable items link to detail pages, back buttons work.

## Approach: Analyze-then-Wire

1. **Analyze navigations** — Scan all screens and widgets, identify every navigatable element
2. **Wire items** — For each element, add proper GoRouter navigation

## Navigation Patterns

```dart
// Push to a route
context.push('/novel/${novel.id}');

// Go to a route (replaces stack)
context.go('/browse');

// Pop back
context.pop();

// Bottom navigation with ShellRoute
GoRouter(routes: [
  ShellRoute(
    builder: (context, state, child) => ScaffoldWithNav(child: child),
    routes: [
      GoRoute(path: '/', builder: ...),
      GoRoute(path: '/browse', builder: ...),
    ],
  ),
]);
```

Do NOT wire filters, tabs, forms, or playback controls (that's layer 3).
