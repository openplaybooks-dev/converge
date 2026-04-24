---
id: 001-split-PulseAvatarBadge
title: "Split: PulseAvatarBadge"
description: Extract PulseAvatarBadge widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/invite_accept/invite_accept_screen.dart
outputs:
  - lib/screens/invite_accept/widgets/pulse_avatar_badge.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/invite_accept/widgets/pulse_avatar_badge.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/invite_accept/widgets/pulse_avatar_badge.dart
vars:
  name: PulseAvatarBadge
  grep: "AnimatedBuilder\\n.*animation: _pulseAnimation"
  description: Avatar with pulsing animation and shield badge
  shared: false
  widgetName: PulseAvatarBadge
  grepString: "AnimatedBuilder\\n.*animation: _pulseAnimation"
  widgetPath: lib/screens/invite_accept/widgets/pulse_avatar_badge.dart
  localWidgetsDir: lib/screens/invite_accept/widgets
  screenPath: lib/screens/invite_accept/invite_accept_screen.dart
  screenId: invite-accept
  screenTitle: null
  subtaskId: 001-split-PulseAvatarBadge
---

# Split: PulseAvatarBadge

Extract the `PulseAvatarBadge` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/invite_accept/invite_accept_screen.dart` using grep string: `AnimatedBuilder\n.*animation: _pulseAnimation`
2. **Create file** — Write `lib/screens/invite_accept/widgets/pulse_avatar_badge.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `PulseAvatarBadge()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class PulseAvatarBadge extends StatelessWidget {
  const PulseAvatarBadge({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
