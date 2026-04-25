---
id: 002-analyze-navigations
title: Analyze navigations — verify pre-seeded markers & emit manifest
description: In v2, phase 03-03-convert pre-seeded every @converge:element marker. This task verifies coverage, scans every marker into navigations.json, and classifies handler status (wired / empty / stub). It does NOT insert new markers — if markers are missing, fail loudly so phase 03 is fixed, not this task.
skill: flutter-implementing-navigation-and-routing
blocking: true
dependencies:
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
  - id: every-element-has-marker
    cmd: "node -e \"const n=JSON.parse(require('fs').readFileSync('navigations.json','utf-8')); const ok=n.screens.every(s=>s.elements.every(e=>e.marker && e.marker.startsWith('// @converge:element'))); process.exit(ok ? 0 : 1)\""
    description: Every element records its existing marker from the Dart source
---

# Analyze navigations — verify markers, emit manifest

Phase 03-03-convert injects `// @converge:element {slug}` on every interactive widget during screen conversion. This task does **not** create markers — it scans them into `navigations.json` so the WBS in 003-wire-per-screen can pick them up.

## Inputs

- `.stitch/screens.json` — route ↔ screen mapping
- `lib/screens/**/*.dart`, `lib/widgets/**/*.dart` — source files with markers already present
- `lib/router/app_router.dart` — route table

## Steps

1. **Verify marker coverage.** For each screen in `lib/screens/`, read the screen file and every file under `widgets/` and `_widgets/`. Expect ≥ 1 `@converge:element` marker per screen. If a screen has zero markers, **fail with an error naming the screen**. Do not silently insert a marker — phase 03 should have done this. Failing here tells the operator to fix phase 03 conversion.

2. **Parse each marker.** A marker line is exactly `// @converge:element <slug>`. The line immediately below is the widget whose handler the marker binds. Find the handler property (`onPressed:`, `onTap:`, `onChanged:`, `onSelected:`, `onDestinationSelected:`) on that widget — it may be 1-6 lines down.

3. **Classify the handler:**
   - `"wired"` — handler body contains at least one of: `context.push`, `context.go`, `context.pop`, `Navigator.of`, `ref.read`, `ref.watch`, `setState`, `showDialog`, `showModalBottomSheet`.
   - `"empty"` — handler is `null`, `() {}`, `() => null`, or body is only a single comment.
   - `"stub"` — handler body is a TODO comment or references an undefined function.

4. **For wired elements, identify the action verbosely** (`"Navigates to /beacon/:id"`, `"Reads beaconsProvider and toggles mute"`). This helps downstream reviewers.

5. **For empty/stub elements, describe what the handler should do.** Derive from: the `@converge:element <slug>` — slugs like `navigate:beacon-detail` or `action:toggle-mute` are self-documenting. Also cross-reference the screen's purpose per `.stitch/screens.json`.

6. **Determine target for navigation handlers.** Use the slug pattern `navigate:<screenId>` → look up route in `lib/router/app_router.dart` or `.stitch/screens.json`.

7. **Emit `navigations.json`:**

```json
{
  "generatedAt": "2026-04-25T...Z",
  "bottomNavRoutes": ["/", "/devices", "/security", "/settings"],
  "screens": [
    {
      "id": "home-safe",
      "route": "/",
      "screenFile": "lib/screens/home_safe/home_safe_screen.dart",
      "widgetFiles": [
        "lib/screens/home_safe/widgets/beacon_strip.dart",
        "lib/screens/home_safe/widgets/status_pill.dart"
      ],
      "elements": [
        {
          "elementId": "navigate:beacon-detail",
          "marker": "// @converge:element navigate:beacon-detail",
          "file": "lib/screens/home_safe/widgets/beacon_strip.dart",
          "type": "onTap",
          "widget": "InkWell",
          "status": "empty",
          "action": "Navigate to /beacon/:id using the tapped Beacon.id",
          "target": "/beacon/:id"
        },
        {
          "elementId": "action:toggle-mute",
          "marker": "// @converge:element action:toggle-mute",
          "file": "lib/screens/home_safe/widgets/mute_chip.dart",
          "type": "onPressed",
          "widget": "FilterChip",
          "status": "wired",
          "action": "Toggles alert mute via alertConfigProvider",
          "target": null
        }
      ]
    }
  ]
}
```

## Banned

- Modifying Dart source files. This task is read-only on `lib/`. If a marker is missing, **fail** — do not silently add one.
- Inventing elementIds from line numbers or widget counts. The `elementId` is the slug from the existing marker, verbatim.
- Classifying a handler as `"wired"` when it only contains a comment.

## Why this changed from v1

In v1, this task scanned widgets, *invented* elementIds, and *inserted* markers post-hoc. That was fragile — if the scanner missed a widget, the marker was never written and downstream wiring silently skipped that handler. In v2, phase 03 owns marker placement (single source of truth), and this task is a read-only auditor. A missing marker is a real bug, not a scanner miss.

## Success Criteria

- `navigations.json` written with ≥ 5 screens and ≥ 10 elements
- Every element has a `marker` field quoting the actual marker line found in source
- Zero source files modified by this task
