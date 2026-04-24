---
id: 002-lift-TrustNotesContainer
title: "Lift: TrustNotesContainer"
description: Move TrustNotesContainer from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/invite_accept/widgets/trust_notes_container.dart
outputs:
  - lib/widgets/trust_notes_container.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/trust_notes_container.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/trust_notes_container.dart
vars:
  widgetName: TrustNotesContainer
  snakeName: trust_notes_container
  screenId: invite-accept
  screenTitle: null
  localWidgetPath: lib/screens/invite_accept/widgets/trust_notes_container.dart
  sharedWidgetPath: lib/widgets/trust_notes_container.dart
  localWidgetsDir: lib/screens/invite_accept/widgets
  screenPath: lib/screens/invite_accept/invite_accept_screen.dart
  subtaskId: 002-lift-TrustNotesContainer
---

# Lift: TrustNotesContainer

Move `TrustNotesContainer` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/invite_accept/widgets/trust_notes_container.dart` → `lib/widgets/trust_notes_container.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/trust_notes_container.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
