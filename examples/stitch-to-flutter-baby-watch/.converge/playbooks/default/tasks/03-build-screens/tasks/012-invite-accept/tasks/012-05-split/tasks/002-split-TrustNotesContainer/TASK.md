---
id: 002-split-TrustNotesContainer
title: "Split: TrustNotesContainer"
description: Extract TrustNotesContainer widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/invite_accept/invite_accept_screen.dart
outputs:
  - lib/screens/invite_accept/widgets/trust_notes_container.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/invite_accept/widgets/trust_notes_container.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/invite_accept/widgets/trust_notes_container.dart
vars:
  name: TrustNotesContainer
  grep: // Trust Notes
  description: Container for trust note items explaining permissions
  shared: false
  widgetName: TrustNotesContainer
  grepString: // Trust Notes
  widgetPath: lib/screens/invite_accept/widgets/trust_notes_container.dart
  localWidgetsDir: lib/screens/invite_accept/widgets
  screenPath: lib/screens/invite_accept/invite_accept_screen.dart
  screenId: invite-accept
  screenTitle: null
  subtaskId: 002-split-TrustNotesContainer
---

# Split: TrustNotesContainer

Extract the `TrustNotesContainer` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/invite_accept/invite_accept_screen.dart` using grep string: `// Trust Notes`
2. **Create file** — Write `lib/screens/invite_accept/widgets/trust_notes_container.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `TrustNotesContainer()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class TrustNotesContainer extends StatelessWidget {
  const TrustNotesContainer({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
