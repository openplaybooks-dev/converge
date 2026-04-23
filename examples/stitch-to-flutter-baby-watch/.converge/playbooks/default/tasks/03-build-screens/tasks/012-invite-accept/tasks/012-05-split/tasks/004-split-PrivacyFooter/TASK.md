---
id: 004-split-PrivacyFooter
title: "Split: PrivacyFooter"
description: Extract PrivacyFooter widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/invite_accept/invite_accept_screen.dart
outputs:
  - lib/screens/invite_accept/widgets/privacy_footer.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/invite_accept/widgets/privacy_footer.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/invite_accept/widgets/privacy_footer.dart
vars:
  name: PrivacyFooter
  grep: // Privacy Footer
  description: Security footer with BabyGuard branding
  shared: false
  widgetName: PrivacyFooter
  grepString: // Privacy Footer
  widgetPath: lib/screens/invite_accept/widgets/privacy_footer.dart
  localWidgetsDir: lib/screens/invite_accept/widgets
  screenPath: lib/screens/invite_accept/invite_accept_screen.dart
  screenId: invite-accept
  screenTitle: null
  subtaskId: 004-split-PrivacyFooter
---

# Split: PrivacyFooter

Extract the `PrivacyFooter` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/invite_accept/invite_accept_screen.dart` using grep string: `// Privacy Footer`
2. **Create file** — Write `lib/screens/invite_accept/widgets/privacy_footer.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `PrivacyFooter()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class PrivacyFooter extends StatelessWidget {
  const PrivacyFooter({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
