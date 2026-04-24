---
id: 003-lift-EventCard
title: "Lift: EventCard"
description: Move EventCard from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/widgets/overlays
outputs:
  - lib/widgets/overlays
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/overlays
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/overlays
vars:
  widgetName: EventCard
  snakeName: event_card
  screenId: history
  screenTitle: null
  localWidgetPath: lib/widgets/overlays
  sharedWidgetPath: lib/widgets/overlays
  localWidgetsDir: lib/screens/history/widgets
  screenPath: lib/screens/history/history_screen.dart
  subtaskId: 003-lift-EventCard
---

# Lift: EventCard

Move `EventCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/widgets/event_card.dart` → `lib/widgets/event_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/event_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files